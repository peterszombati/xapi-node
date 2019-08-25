import {
	MessagesQueue,
	Transaction,
	TransactionReject,
	Transactions,
	TransactionStatus,
	TransactionType
} from "../interface/XapiTypeGuard";
import {Queue} from "./Queue";
import {Time} from "../modules/Time";
import {WebSocketModule} from "../modules/WebSocketModule";
import Logger from "../utils/Logger";
import {errorCode} from "../enum/errorCode";
import Utils from "../utils/Utils";

export class MessageTube extends Queue {

	public transactions: Transactions = {};
	private _lastReceivedMessage: Time = new Time(false);
	public get lastReceivedMessage() { return this._lastReceivedMessage; }
	protected WebSocket: WebSocketModule;

	constructor(rateLimit: number) {
		super(rateLimit);
	}

	public addTransaction(transaction: Transaction<null,null>, transactionId: string): Transaction<null, null> {
		this.transactions[transactionId] = transaction;
		return transaction;
	}

	public rejectOldTransactions(): void {
		Object.values(this.transactions).forEach(transaction => {
			const elapsedMs = transaction.createdAt.elapsedMs();
			if (elapsedMs != null && elapsedMs > 60000) {
				if (transaction.transactionPromise.tReject !== null) {
					this.rejectTransaction({ code: errorCode.XAPINODE_3, explain: "Timeout"}, transaction);
				}
			}
		});
	}

	public removeOldTransactions(): number {
		let deleted = 0;
		Object.values(this.transactions)
			.filter(t => t.transactionPromise.tReject === null && t.transactionPromise.tResolve === null)
			.forEach(transaction => {
			const elapsedMs = transaction.createdAt.elapsedMs();
			if (elapsedMs != null && elapsedMs > 86400000) {
				delete this.transactions[transaction.transactionId];
				deleted += 1;
			}
		});
		return deleted;
	}

	private sendMessage(json: string): Time | null {
		try {
			const time: Time = new Time();
			this.WebSocket.send(json);
			return time;
		} catch (e) {
			Logger.log.error(e.toString());
			return null;
		}
	}

	protected resolveTransaction(returnData: any, time: Time, transaction: Transaction<any,TransactionReject>) {
		transaction.status = TransactionStatus.successful;
		if (transaction.transactionPromise.tResolve !== null) {
			const resolve = transaction.transactionPromise.tResolve;
			transaction.transactionPromise = { tResolve: null, tReject: null };
			if (transaction.type === TransactionType.STREAM) {
				Logger.log.hidden(" Stream (" + transaction.transactionId + "): " + transaction.command + ", " + JSON.stringify(transaction.request.arguments), "INFO");
				resolve({transaction});
			} else {
				const elapsedMs = transaction.response.received !== null && transaction.response.received.getDifference(transaction.request.sent);
				Logger.log.hidden("Socket (" + transaction.transactionId + "): "
					+ transaction.command + ", "
					+ (transaction.command === "login" ? "(arguments contains secret information)" : JSON.stringify(transaction.request.arguments))
					+ ", ("+elapsedMs+"ms)", "INFO");
				resolve({returnData, time, transaction})
			}
			Logger.log.hidden("Transaction archived:\n" + Utils.transactionToJSONString(transaction), "INFO", "Transactions");
		} else {
			Logger.log.hidden("Transaction archived (promise resolve is null):\n" + Utils.transactionToJSONString(transaction), "INFO", "Transactions");
		}
	}

	protected rejectTransaction({code, explain}: { code: string, explain: string }, transaction: Transaction<null,TransactionReject>, interrupted: boolean = false ) {
		transaction.status = interrupted === false ? TransactionStatus.timeout : TransactionStatus.interrupted;
		Logger.log.hidden((transaction.type ? "Stream" : "Socket") + " message rejected (" + transaction.transactionId + "): "
			+ transaction.command + ", "
			+ (transaction.command === "login" ? "(arguments contains secret information)" : JSON.stringify(transaction.request.arguments))
			+ "\nReason:\n" + JSON.stringify({code, explain}, null, "\t"), "ERROR");
		if (transaction.transactionPromise.tReject !== null) {
			const reject = transaction.transactionPromise.tReject;
			transaction.transactionPromise = { tResolve: null, tReject: null };
			reject({ reason: {code, explain}, transaction });
		}
		Logger.log.hidden("Transaction archived:\n" + Utils.transactionToJSONString(transaction), "INFO", "Transactions");
	}

	protected sendJSON(command: string, json: string, transaction: Transaction<any, any>, addQueu: boolean = true): boolean {
		if (json.length > 1000) {
			if (transaction !== undefined) {
				const json = { code: errorCode.XAPINODE_0, explain: "Each command invocation should not contain more than 1kB of data." };
				transaction.response = {
					status: false,
					received: new Time(),
					json
				};
				this.rejectTransaction(json, transaction);
			}
			return false;
		}

		if (!this.isRateLimitReached()) {
			if (this.queueSize === 0 || !addQueu) {
				const sentTime = this.sendMessage(json);
				if (sentTime !== null) {
					this.addElapsedTime(sentTime);
					transaction.request.sent = new Time();
					transaction.status = (transaction.type === TransactionType.STREAM)
						? TransactionStatus.successful
						: TransactionStatus.sent;
					if (transaction.type === TransactionType.STREAM) {
						this.resolveTransaction(null, new Time(), transaction);
					}
					return true;
				}
			}
		}

		if (addQueu) {
			try {
				this.addQueu(transaction);
			} catch (e) {
				transaction.response = {
					status: false,
					received: new Time(),
					json: e
				};
				this.rejectTransaction(e, transaction);
			}
		}

		if (this.queueSize > 0 && this.messageSender === null) {
			this.callKillQueuTimeout();
		}
		return false;
	}

	protected callKillQueuTimeout() {

		const getTimeoutMs = () => {
			if (this.messagesElapsedTime.length <= 3) {
				return 100;
			}
			const elapsedMs = this.messagesElapsedTime[this.messagesElapsedTime.length - 4].elapsedMs();
			return this.rateLimit() + 20 + (elapsedMs == null ? 0 : elapsedMs);
		};

		const timeoutMs = getTimeoutMs();

		this.messageSender = setTimeout(() => {
			this.messageSender = null;
			this.tryKillQueu(this.messageQueues.urgent);
			this.tryKillQueu(this.messageQueues.normal);
		}, timeoutMs);
	}

	protected tryKillQueu(queue: MessagesQueue[]) {
		for (let i = 0; i < queue.length; i++) {
			const { transactionId } = queue[i];
			const { request: { json }, command, status } = this.transactions[transactionId];
			if (status === TransactionStatus.waiting) {
				const isSent = this.sendJSON(command, json, this.transactions[transactionId], false);
				if (isSent) {
					this.cleanQueue();
				} else {
					this.callKillQueuTimeout();
					return;
				}
			}
		}
	}

	protected cleanQueue() {
		this.messageQueues = {
			urgent: this.messageQueues.urgent.filter(q => this.transactions[q.transactionId].status === TransactionStatus.waiting),
			normal: this.messageQueues.normal.filter(q => this.transactions[q.transactionId].status === TransactionStatus.waiting),
		};
	}

}

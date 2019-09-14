import {
	Transaction,
	TransactionReject,
	Transactions,
} from "../interface/Interface";
import {Queue} from "./Queue";
import {Time} from "../modules/Time";
import {WebSocketModule} from "../modules/WebSocketModule";
import Logger from "../utils/Logger";
import {errorCode} from "../enum/errorCode";
import Utils from "../utils/Utils";
import {TransactionStatus, TransactionType} from "../enum/Enum";

export class MessageTube extends Queue {

	public transactions: Transactions = {};
	private _lastReceivedMessage: Time = new Time(false);
	public get lastReceivedMessage() { return this._lastReceivedMessage; }
	protected WebSocket: WebSocketModule;

	constructor(rateLimit: number, type: TransactionType) {
		super(rateLimit, type);
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

	private hideSecretInfo(transaction: Transaction<any, any>): Transaction<any, any> {
		return {
			...transaction,
			request: {
				...transaction.request,
				json: "json contains secret information",
				arguments: {},
			}
		}
	}

	protected rejectTransaction({code, explain}: { code: string, explain: string }, transaction: Transaction<null,TransactionReject>, interrupted: boolean = false ) {
		transaction.status = interrupted ? TransactionStatus.interrupted : TransactionStatus.timeout;
		Logger.log.hidden((transaction.type === TransactionType.STREAM ? "Stream" : "Socket") + " message rejected (" + transaction.transactionId + "): "
			+ transaction.command + ", "
			+ (transaction.command === "login" ? "(arguments contains secret information)" : JSON.stringify(transaction.request.arguments))
			+ "\nReason:\n" + JSON.stringify({code, explain}, null, "\t"), "ERROR");
		if (transaction.transactionPromise.tReject !== null) {
			const reject = transaction.transactionPromise.tReject;
			transaction.transactionPromise = { tResolve: null, tReject: null };
			reject({
				reason: {code, explain},
				transaction: transaction.command === "login" ? this.hideSecretInfo(transaction) : transaction
			});
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
			return true;
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
				return true;
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
			this.tryCleanQueue();
		}, timeoutMs);
	}

	protected tryCleanQueue() {
		while(this.messageQueues.urgent.length > 0) {
			const { transactionId } = this.messageQueues.urgent[0];
			const { request: { json }, command, status } = this.transactions[transactionId];
			const isSent = this.sendJSON(command, json, this.transactions[transactionId], false);
			if (isSent) {
				this.messageQueues.urgent.shift();
			} else {
				return;
			}
		}
		while(this.messageQueues.normal.length > 0) {
			const { transactionId } = this.messageQueues.normal[0];
			const { request: { json }, command, status } = this.transactions[transactionId];
			const isSent = this.sendJSON(command, json, this.transactions[transactionId], false);
			if (isSent) {
				this.messageQueues.normal.shift();
			} else {
				return;
			}
		}
	}

}

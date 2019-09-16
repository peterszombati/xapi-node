import {
	Transaction,
	TransactionReject,
	Transactions,
} from "../interface/Interface";
import {Queue} from "./Queue";
import {Time} from "../modules/Time";
import {WebSocketWrapper} from "../modules/WebSocketWrapper";
import Logger from "../utils/Logger";
import {errorCode} from "../enum/errorCode";
import Utils from "../utils/Utils";
import {TransactionStatus, TransactionType} from "../enum/Enum";

export class MessageTube extends Queue {

	public transactions: Transactions = {};
	private _lastReceivedMessage: Time = new Time(false);
	public get lastReceivedMessage() { return this._lastReceivedMessage; }
	protected WebSocket: WebSocketWrapper;

	constructor(rateLimit: number, type: TransactionType) {
		super(rateLimit, type);
	}

	public addTransaction(transaction: Transaction<null,null>): Transaction<null, null> {
		this.transactions[transaction.transactionId] = transaction;
		return transaction;
	}

	public rejectOldTransactions(): void {
		Object.values(this.transactions).forEach(transaction => {
			const elapsedMs = transaction.createdAt.elapsedMs();
			if (elapsedMs != null && elapsedMs > 60000) {
				if (transaction.transactionPromise.tReject !== null) {
					this.rejectTransaction({ code: errorCode.XAPINODE_3, explain: "Timeout"}, transaction, false, new Time());
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

	protected rejectTransaction(
		json: { code: string, explain: string },
		transaction: Transaction<null,TransactionReject>,
		interrupted: boolean = false,
		received: Time = new Time()
	) {
		transaction.status = interrupted ? TransactionStatus.interrupted : TransactionStatus.timeout;
		transaction.response = {
			status: false,
			received,
			json
		};
		Logger.log.hidden(transaction.type + " message rejected (" + transaction.transactionId + "): "
			+ transaction.command + ", "
			+ (transaction.command === "login" ? "(arguments contains secret information)" : JSON.stringify(transaction.request.arguments))
			+ "\nReason:\n" + JSON.stringify(json, null, "\t"), "ERROR");
		if (transaction.transactionPromise.tReject !== null) {
			const reject = transaction.transactionPromise.tReject;
			transaction.transactionPromise = { tResolve: null, tReject: null };
			reject({
				reason: json,
				transaction: transaction.command === "login" ? Utils.hideSecretInfo(transaction) : transaction
			});
		}
		Logger.log.hidden("Transaction archived:\n" + Utils.transactionToJSONString(transaction), "INFO", "Transactions");
	}

	protected sendJSON(transaction: Transaction<any, any>, addQueu: boolean): boolean {
		if (transaction.request.json.length > 1000) {
			this.rejectTransaction({
				code: errorCode.XAPINODE_0,
				explain: "Each command invocation should not contain more than 1kB of data."
			}, transaction, false, new Time());
			return true;
		}

		if (!this.isRateLimitReached()) {
			if (this.queueSize === 0 || !addQueu) {
				const sentTime = this.sendMessage(transaction.request.json);
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
				this.rejectTransaction(e, transaction, false, new Time());
				return true;
			}
		}

		if (this.queueSize > 0 && this.messageSender === null) {
			this.callCleanQueuTimeout();
		}
		return false;
	}

	protected callCleanQueuTimeout() {

		const getTimeoutMs = () => {
			if (this.messagesElapsedTime.length <= 3) {
				return 100;
			}
			const elapsedMs = this.messagesElapsedTime[this.messagesElapsedTime.length - 4].elapsedMs();
			return this.rateLimit + 20 + (elapsedMs == null ? 0 : elapsedMs);
		};

		const timeoutMs = getTimeoutMs();

		this.messageSender = setTimeout(() => {
			this.messageSender = null;
			this.tryCleanQueue();
		}, timeoutMs);
	}

	protected tryCleanQueue() {
		while(this.queueSize > 0) {
			const urgent = this.messageQueues.urgent.length > 0;
			const { transactionId } = urgent ? this.messageQueues.urgent[0] : this.messageQueues.normal[0];
			const isSent = this.sendJSON(this.transactions[transactionId], false);
			if (isSent) {
				if (urgent) {
					this.messageQueues.urgent.shift();
				} else {
					this.messageQueues.normal.shift();
				}
			} else {
				return;
			}
		}
	}

}

import {AddTransaction, MessagesQueue, Transaction, TransactionReject, Transactions} from "../interface/Interface";
import {Listener} from "../modules/Listener";
import {Time} from "../modules/Time";
import Logger from "../utils/Logger";
import {TransactionStatus, TransactionType} from "../enum/Enum";
import Utils from "../utils/Utils";
import {WebSocketWrapper} from "../modules/WebSocketWrapper";
import {errorCode} from "../enum/errorCode";

export class Queue extends Listener {
	public status: boolean = false;
	protected openTimeout: NodeJS.Timeout | null = null;
	public transactions: Transactions = {};
	private _lastReceivedMessage: Time = new Time(false);
	public get lastReceivedMessage() { return this._lastReceivedMessage; }
	protected WebSocket: WebSocketWrapper;
	private type: TransactionType;
	private messageQueues: { urgent: MessagesQueue[], normal: MessagesQueue[] } = { urgent: [], normal: [] };
	private _transactionIdIncrement: number = 0;
	private get queueSize() {
		return this.messageQueues.urgent.length + this.messageQueues.normal.length;
	}
	private messagesElapsedTime: Time[] = [];
	private messageSender: NodeJS.Timeout | null = null;
	private rateLimit: number;
	constructor(rateLimit: number, type: TransactionType) {
		super();
		this.rateLimit = rateLimit;
		this.type = type;
	}

	private addQueu(transaction: Transaction<any,any>): void {
		const { urgent, transactionId } = transaction;
		if (this.queueSize >= 150) {
			this.rejectTransaction({ code: errorCode.XAPINODE_2, explain: "messageQueues exceeded 150 size limit" }, transaction);
		} else {
			if (urgent) {
				this.messageQueues.urgent.push({transactionId});
			} else {
				this.messageQueues.normal.push({transactionId});
			}
			Logger.log.hidden((this.type === TransactionType.STREAM ? " Stream" : "Socket")
				+ " (" + transaction.transactionId + "): added to queue (messages in queue = " + this.queueSize + ")", "INFO");
		}
	}

	private addElapsedTime(time: Time) {
		this.messagesElapsedTime.push(time);
		if (this.messagesElapsedTime.length > 4) {
			this.messagesElapsedTime.shift();
		}
	}

	private isRateLimitReached() {
		if (this.messagesElapsedTime.length < 4) {
			return false;
		}
		const elapsedMs = this.messagesElapsedTime[this.messagesElapsedTime.length - 4].elapsedMs();
		return elapsedMs !== null && elapsedMs < this.rateLimit;
	}

	protected resetMessageTube() {
		if (this.queueSize > 0) {
			Logger.log.info((this.type === TransactionType.STREAM ? " Stream" : "Socket")
				+ " Message queue reseted, deleted = " + this.queueSize);
		}
		this.messageQueues = { urgent: [], normal: [] };
		this.messagesElapsedTime = [];
		if (this.messageSender != null) {
			clearTimeout(this.messageSender);
		}
	}

	public createTransactionId(): string {
		this._transactionIdIncrement += 1;
		if (this._transactionIdIncrement > 9999) {
			this._transactionIdIncrement = 0;
		}
		return Utils.getUTCTimestampString() + Utils.formatNumber(this._transactionIdIncrement, 4) + (this.type === TransactionType.SOCKET ? '0' : '1');
	}

	protected addTransaction(newTransaction: AddTransaction): Transaction<null, null> {
		this.transactions[newTransaction.transactionId] = {
			command: newTransaction.command,
			type: this.type,
			request: { json: newTransaction.json, arguments: newTransaction.args, sent: null },
			response: { json: null, received: null, status: null },
			transactionId: newTransaction.transactionId,
			createdAt: new Time(),
			status: TransactionStatus.waiting,
			transactionPromise: { tResolve: newTransaction.resolve, tReject: newTransaction.reject },
			urgent: newTransaction.urgent
		};
		return this.transactions[newTransaction.transactionId];
	}

	public rejectOldTransactions(): void {
		Object.values(this.transactions)
			.filter(t => t.transactionPromise.tReject !== null)
			.forEach(transaction => {
				const elapsedMs = transaction.createdAt.elapsedMs();
				if (elapsedMs != null
					&& elapsedMs > 60000) {
					this.rejectTransaction({ code: errorCode.XAPINODE_3, explain: "Timeout"}, transaction);
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
			}, transaction);
			return true;
		}

		if (!this.isRateLimitReached()) {
			if (this.queueSize === 0 || !addQueu) {
				const sentTime = this.sendMessage(transaction.request.json);
				if (sentTime !== null) {
					this.addElapsedTime(sentTime);
					transaction.request.sent = sentTime;
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
			this.addQueu(transaction);
		}

		if (this.queueSize > 0 && this.messageSender === null) {
			this.callCleanQueuTimeout();
		}
		return false;
	}

	private callCleanQueuTimeout() {
		if (this.messagesElapsedTime.length <= 3) {
			this.tryCleanQueue();
			return;
		}

		const elapsedMs = this.messagesElapsedTime[this.messagesElapsedTime.length - 4].elapsedMs();
		const timeoutMs = this.rateLimit + 20 - (elapsedMs == null ? 0 : elapsedMs);

		this.messageSender = setTimeout(() => {
			this.messageSender = null;
			this.tryCleanQueue();
		}, timeoutMs < 0 ? 0 : timeoutMs);
	}

	private tryCleanQueue() {
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

import {
	Transaction,
	TransactionReject,
	Transactions,
	TransactionStatus
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

	private sendMessage(json: string): boolean {
		try {
			this.WebSocket.send(json);
		} catch (e) {
			return false;
		}
		return true;
	}

	protected resolveTransaction(returnData: any, time: Time, transaction: Transaction<any,TransactionReject>) {
		transaction.status = TransactionStatus.successful;
		if (transaction.transactionPromise.tResolve !== null) {
			const resolve = transaction.transactionPromise.tResolve;
			transaction.transactionPromise = { tResolve: null, tReject: null };
			if (transaction.isStream) {
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
		Logger.log.hidden((transaction.isStream ? "Stream" : "Socket") + " message rejected (" + transaction.transactionId + "): "
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
			const reason = "Each command invocation should not contain more than 1kB of data.";
			if (transaction !== undefined) {
				const json = { code: errorCode.XAPINODE_0, explain: reason };
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
			const time: Time = new Time();
			const isSuccess = this.sendMessage(json);
			if (isSuccess) {
				this.addElapsedTime(time);
				transaction.request.sent = new Time();
					if (transaction.isStream) {
						transaction.status = TransactionStatus.successful;
						this.resolveTransaction(null, new Time(), transaction);
					} else {
						transaction.status = TransactionStatus.sent;
					}
				return true;
			}
		}

		if (addQueu) {
			const isSuccess = this.addQueu(transaction);
			if (!isSuccess.status) {
				const json: { code: errorCode, explain: string } = { code: errorCode.XAPINODE_2, explain: "" + isSuccess.data };
				transaction.response = {
					status: false,
					received: new Time(),
					json
				};
				this.rejectTransaction(json, transaction);
			}
		}

		if (this.messageQueues.length > 0 && this.isKillerCalled === null) {
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

		this.isKillerCalled = setTimeout(() => {
			this.isKillerCalled = null;
			this.tryKillQueu();
		}, timeoutMs);
	}

	protected tryKillQueu() {
		if (this.isKillerCalled != null) {
			return;
		}
		for (let i = 0; i < this.messageQueues.length; i++) {
			const { transactionId } = this.messageQueues[i];
			const { request: { json }, command } = this.transactions[transactionId];
			const isSent = this.sendJSON(command, json, this.transactions[transactionId], false);
			if (isSent) {
				this.messageQueues.splice(i, 1);
				i -= 1;
			} else {
				if (this.isKillerCalled === null) {
					this.callKillQueuTimeout();
				}
				break;
			}
		}
	}

}

import {
	Transaction,
	TransactionReject,
	Transactions,
	TransactionStatus
} from "../interface/XapiTypeGuard";
import {Queue} from "./Queue";
import {Time} from "../modules/Time";
import {WebSocketModule} from "../modules/WebSocketModule";

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
		if (transaction.promise.resolve !== null) {
			const resolve = transaction.promise.resolve;
			transaction.promise = { resolve: null, reject: null };
			if (transaction.isStream) {
				resolve({transaction});
			} else {
				resolve({returnData, time, transaction})
			}
		}
	}

	protected rejectTransaction(reason: { code: string, explain: string }, transaction: Transaction<null,TransactionReject>, interrupted: boolean = false ) {
		transaction.status = interrupted === false ? TransactionStatus.timeout : TransactionStatus.interrupted;
		if (transaction.promise.reject !== null) {
			const reject = transaction.promise.reject;
			transaction.promise = { resolve: null, reject: null };
			reject({ reason, transaction });
		}
	}

	protected sendJSON(command: string, json: string, transaction: Transaction<any, any>, addQueu: boolean = true): boolean {
		if (json.length > 1000) {
			const reason = "Each command invocation should not contain more than 1kB of data.";
			if (transaction !== undefined) {
				const json = { code: "XAPINODE_0", explain: reason };
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
						this.resolveTransaction(null, null, transaction);
					} else {
						transaction.status = TransactionStatus.sent;
					}
				return true;
			}
		}

		if (addQueu) {
			const isSuccess = this.addQueu(transaction.transactionId, transaction.urgent);
			if (!isSuccess.status) {
				const json = { code: "XAPINODE_2", explain: isSuccess.data };
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
		const timeoutMs = this.messagesElapsedTime.length <= 4 ? 100
			: Math.max((this.rateLimit() + 5) - this.messagesElapsedTime[this.messagesElapsedTime.length - 5].elapsedMs(), 0);
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

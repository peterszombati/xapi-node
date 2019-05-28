import {Transaction, Transactions, TransactionStatus} from "../interface/XapiTypeGuard";
import {Queue} from "./Queue";
import {Time} from "../modules/Time";
import {WebSocketModule} from "../modules/WebSocketModule";

export class MessageTube extends Queue {

	public transactions: Transactions = {};
	private _lastReceivedMessage: Time = new Time(false);
	public get lastReceivedMessage() { return this._lastReceivedMessage; }
	protected WebSocket: WebSocketModule ;

	constructor() {
		super();
	}

	public addTransaction<T>(transaction: Transaction<T>, transactionId: string): void {
		this.transactions[transactionId] = transaction;
	}

	private sendMessage(json: string): boolean {
		try {
			this.WebSocket.send(json);
		} catch (e) {
			return false;
		}
		return true;
	}

	protected resolveTransaction(returnData: any, time: Time, transaction: Transaction<any>) {
		transaction.status = TransactionStatus.successful;
		if (transaction.promise.resolve !== null) {
			const resolve = transaction.promise.resolve;
			transaction.promise = { resolve: null, reject: null };
			resolve({returnData, time, transaction})
		}
	}

	protected rejectTransaction(reason: { code: string, explain: string }, transaction: Transaction<any>, interrupted: boolean = false ) {
		transaction.status = interrupted === false ? TransactionStatus.timeout : TransactionStatus.interrupted;
		if (transaction.promise.reject !== null) {
			const reject = transaction.promise.reject;
			transaction.promise = { resolve: null, reject: null };
			reject({ reason, transaction });
		}
	}

	protected sendJSON(command: string, json: string, transactionId: string, addQueu: boolean = true): boolean {
		if (json.length > 1000) {
			const reason = "Each command invocation should not contain more than 1kB of data.";
			if (this.transactions[transactionId] !== undefined) {
				const json = { code: "XAPINODE_0", explain: reason };
				this.transactions[transactionId].response = {
					status: false,
					received: new Time(),
					json
				};
				this.rejectTransaction(json, this.transactions[transactionId]);
			}
			return false;
		}

		if (!this.isRateLimitReached()) {
			const time: Time = new Time();
			const isSuccess = this.sendMessage(json);
			if (isSuccess) {
				this.addElapsedTime(time);
				if (this.transactions[transactionId] !== undefined) {
					this.transactions[transactionId].request.sent = new Time();
					if (this.transactions[transactionId].isStream) {
						this.transactions[transactionId].status = TransactionStatus.successful;
					} else {
						this.transactions[transactionId].status = TransactionStatus.sent;
					}
				}
				return true;
			}
		}

		if (addQueu) {
			const isSuccess = this.addQueu(transactionId);
			if (!isSuccess) {
				const json = { code: "XAPINODE_2", explain: 'messageQueues exceeded 150 limit' };
				this.transactions[transactionId].response = {
					status: false,
					received: new Time(),
					json
				};
				this.rejectTransaction(json, this.transactions[transactionId]);
			}
		}

		if (this.messageQueues.length > 0 && this.isKillerCalled === null) {
			this.callKillQueuTimeout();
		}
		return false;
	}

	protected callKillQueuTimeout() {
		const timeoutMs = this.messagesElapsedTime.length > 4 ? Math.max(1052 - this.messagesElapsedTime[this.messagesElapsedTime.length - 5].elapsedMs(), 0) : 100;
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
			const isSent = this.sendJSON(command, json, transactionId, false);
			if (isSent) {
				this.messageQueues.splice(i, 1);
				i -= 1;
			} else {
				this.callKillQueuTimeout();
				break;
			}
		}
	}

}

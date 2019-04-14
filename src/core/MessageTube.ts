import {Transaction, Transactions, TransactionStatus} from "../interface/XapiTypeGuard";
import {Queue} from "./Queue";
import {Time} from "../utils/Time";
import {WebSocketUtil} from "../utils/WebSocketUtil";

export class MessageTube extends Queue {

	public transactions: Transactions = {};
	private _lastReceivedMessage: Time = new Time(false);
	public get lastReceivedMessage() { return this._lastReceivedMessage; }
	protected WebSocket: WebSocketUtil ;

	constructor() {
		super();
	}

	public addTransaction(transaction: Transaction, transactionId: string): void {
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

	protected sendJSON(command: string, json: string, transactionId: string, addQueu: boolean = true): boolean {
		if (json.length > 1000) {
			console.error(`Each command invocation should not contain more than 1kB of data. (length = ${json.length}, transactionId = ${transactionId})`);
			if (this.transactions[transactionId] !== undefined) {
				this.transactions[transactionId].status = TransactionStatus.timeout;
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
			this.addQueu(command, transactionId, json);
		}

		if (this.messageQueues.length > 0 && this.isKillerCalled === null) {
			this.callKillQueuTimeout();
		}
		return false;
	}

	protected callKillQueuTimeout() {
		const timeoutMs = this.messagesElapsedTime.length > 4 ? Math.max(1002 - this.messagesElapsedTime[this.messagesElapsedTime.length - 5].elapsedMs(), 0) : 100;
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
			const { command, json, transactionId} = this.messageQueues[i];
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

	protected resetMessageTube() {
		this.messageQueues = [];
		this.messagesElapsedTime = [];
		this.stopQueuKiller();
	}

}

import {MessagesQueue, Transaction, TransactionType} from "../interface/XapiTypeGuard";
import {Listener} from "../modules/Listener";
import {Time} from "../modules/Time";
import Logger from "../utils/Logger";

export class Queue extends Listener {
	protected messageQueues: { urgent: MessagesQueue[], normal: MessagesQueue[] } = { urgent: [], normal: [] };
	protected get queueSize() {
		return this.messageQueues.urgent.length + this.messageQueues.normal.length;
	}
	protected messagesElapsedTime: Time[] = [];
	protected messageSender: any = null;
	private _rateLimit: number;
	protected rateLimit() { return this._rateLimit; }
	constructor(rateLimit: number) {
		super();
		this._rateLimit = rateLimit;
	}

	protected addQueu(transaction: Transaction<any,any>): void {
		const { urgent, transactionId } = transaction;
		if (this.queueSize >= 150) {
			throw "messageQueues exceeded 150 size limit";
		}

		if (urgent) {
			this.messageQueues.urgent.push({transactionId});
		} else {
			this.messageQueues.normal.push({transactionId});
		}
		Logger.log.hidden((transaction.type === TransactionType.STREAM ? " Stream" : "Socket")
			+ " (" + transaction.transactionId + "): added to queue (messages in queue = " + this.queueSize + ")", "INFO");
	}

	protected addElapsedTime(time: Time) {
		this.messagesElapsedTime.push(time);
		if (this.messagesElapsedTime.length > 4) {
			this.messagesElapsedTime.shift();
		}
	}

	protected isRateLimitReached() {
		if (this.messagesElapsedTime.length < 4) {
			return false;
		}
		const elapsedMs = this.messagesElapsedTime[this.messagesElapsedTime.length - 4].elapsedMs();
		return elapsedMs !== null && elapsedMs < this._rateLimit;
	}

	protected resetMessageTube(source: string) {
		if (this.queueSize > 0) {
			Logger.log.info((source === "Stream" ? " Stream" : "Socket")
				+ " Message queue reseted, deleted = " + this.queueSize);
		}
		this.messageQueues = { urgent: [], normal: [] };
		this.messagesElapsedTime = [];
		if (this.messageSender != null) {
			clearTimeout(this.messageSender);
		}
	}
}

import {MessagesQueue, Transaction} from "../interface/XapiTypeGuard";
import {Listener} from "../modules/Listener";
import {Time} from "../modules/Time";

export class Queue extends Listener {
	protected messageQueues: MessagesQueue[] = [];
	protected messagesElapsedTime: Time[] = [];
	protected isKillerCalled: any = null;
	private _rateLimit: number;
	protected rateLimit() { return this._rateLimit; }
	constructor(rateLimit: number) {
		super();
		this._rateLimit = rateLimit;
	}

	protected addQueu(transactionId: string, urgent: boolean): { status: boolean, data: string | null } {
		if (this.messageQueues.length < 150) {
			if (urgent && this.messageQueues.length > 0) {
				const i = this.messageQueues.findIndex(q => q.urgent === false);
				if (i === -1) {
					this.messageQueues.push({transactionId, urgent});
				} else {
					this.messageQueues.splice(i, 0, {transactionId, urgent});
				}
			} else {
				this.messageQueues.push({transactionId, urgent});
			}
			return { status: true, data: null};
		}
		return { status: false, data: "messageQueues exceeded 150 limit" };
	}

	protected addElapsedTime(time: Time) {
		this.messagesElapsedTime.push(time);
		if (this.messagesElapsedTime.length > 4) {
			this.messagesElapsedTime.shift();
		}
	}

	protected isRateLimitReached() {
		return (this.messagesElapsedTime.length > 3) &&
			(this.messagesElapsedTime[this.messagesElapsedTime.length - 4].elapsedMs() < this._rateLimit);
	}

	protected stopQueuKiller() {
		if (this.isKillerCalled != null) {
			clearTimeout(this.isKillerCalled);
		}
	}

	protected resetMessageTube() {
		this.messageQueues = [];
		this.messagesElapsedTime = [];
		this.stopQueuKiller();
	}
}

import {MessagesQueue} from "../interface/XapiTypeGuard";
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

	protected addQueu(transactionId: string): boolean {
		if (this.messageQueues.length < 150) {
			this.messageQueues.push({ transactionId });
			return true;
		}
		return false;
	}

	protected addElapsedTime(time: Time) {
		this.messagesElapsedTime.push(time);
		if (this.messagesElapsedTime.length > 5) {
			this.messagesElapsedTime.shift();
		}
	}

	protected isRateLimitReached() {
		return (this.messagesElapsedTime.length > 4) &&
			(this.messagesElapsedTime[this.messagesElapsedTime.length - 5].elapsedMs() < this._rateLimit);
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

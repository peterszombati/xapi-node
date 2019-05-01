import {MessagesQueue} from "../interface/XapiTypeGuard";
import {Listener} from "../modules/Listener";
import {Time} from "../modules/Time";

export class Queue extends Listener {
	protected messageQueues: MessagesQueue[] = [];
	protected messagesElapsedTime: Time[] = [];
	private messageQueuesWarning: Time = null;
	protected isKillerCalled: any = null;

	protected addQueu(transactionId: string) {
		if (this.messageQueues.length < 150) {
			this.messageQueues.push({ transactionId });
		} else if (this.messageQueuesWarning == null || this.messageQueuesWarning.elapsedMs() > 10000) {
			//TODO: console.error(`messageQueues length exceeded 150 (length = ${this.messageQueues.length})`);
			this.messageQueuesWarning = new Time();
		}
	}

	protected addElapsedTime(time: Time) {
		this.messagesElapsedTime.push(time);
		if (this.messagesElapsedTime.length > 5) {
			this.messagesElapsedTime.shift();
		}
	}

	protected isRateLimitReached() {
		return (this.messagesElapsedTime.length > 4) &&
			(this.messagesElapsedTime[this.messagesElapsedTime.length - 5].elapsedMs() < 1000);
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

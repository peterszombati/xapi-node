
import {MessagesQueue} from "../interface/XapiTypeGuard";
import {Listener} from "../modules/Listener";
import {Time} from "../modules/Time";

export class Queue extends Listener {
	protected messageQueues: MessagesQueue[] = [];
	protected messagesElapsedTime: Time[] = [];
	private messageQueuesWarning: Time = null;
	protected isKillerCalled: any = null;

	protected addQueu(command: string, transactionId: string, json: string) {
		if (this.messageQueues.length < 200) {
			this.messageQueues.push({command, transactionId, json});
		} else if (this.messageQueuesWarning == null || this.messageQueuesWarning.elapsedMs() > 10000) {
			console.error(`messageQueues length exceeded 200 (length = ${this.messageQueues.length})`);
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
}

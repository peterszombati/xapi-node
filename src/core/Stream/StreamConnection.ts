import XAPI from "../XAPI";
import {MessageTube} from "../MessageTube";
import {TransactionStatus} from "../../interface/XapiTypeGuard";
import {Time} from "../../modules/Time";
import {WebSocketModule} from "../../modules/WebSocketModule";

export class StreamConnection extends MessageTube{
	private XAPI: XAPI;
	public status: boolean = false;

	constructor(XAPI: XAPI) {
		super();
		this.XAPI = XAPI;
	}

	private handleData(command: string, data: any, time: Time) {
		if (this.listeners[command] === undefined) {
			return;
		}

		this.callListener(command, [data, time]);
	}

	public connect() {
		this.WebSocket = new WebSocketModule('wss://' + this.XAPI.getHostname() +'/' + this.XAPI.getAccountType() + "Stream");
		this.WebSocket.onOpen(() => {
			this.handleSocketOpen(new Time());
		});

		this.WebSocket.onClose(() => {
			this.handleSocketClose(new Time());
		});

		this.WebSocket.onMessage((message: any) => {
			try {
				this.handleSocketMessage(JSON.parse(message.toString().trim()), new Time());
			} catch (e) {}
		});

		this.WebSocket.onError((e: any) => {
			this.handleSocketError(e, new Time());
		});
	}

	private handleSocketOpen(time: Time) {
		this.status = true;
		this.resetMessageTube();
		if (this.XAPI.getSession().length > 0) {
			this.XAPI.callListener("xapiReady");
		}
	}

	private handleSocketMessage(message: any, time: Time) {
		this.lastReceivedMessage.reset();
		this.handleData(message.command, message.data, time);
	}

	private handleSocketError(error: any, time: Time) {
		//console.error(error);
	}

	private handleSocketClose(time: Time) {
		this.status = false;
		this.resetMessageTube();
		if (this.XAPI.tryReconnect) {
			setTimeout(() => {
				this.connect();
			}, 2000);
		}
	}

	protected sendCommand(command: string, completion: any = {}): string {
		const transactionId = this.XAPI.createTransactionId();
		const json = JSON.stringify({
			command,
			"streamSessionId": this.XAPI.getSession(),
			...completion
		});
		this.addTransaction({
			command,
			isStream: true,
			request: { json, arguments: completion, sent: null},
			response: { json: null, received: null, status: null },
			transactionId,
			createdAt: new Time(),
			status: TransactionStatus.waiting,
			promise: { resolve: null, reject: null }
		}, transactionId);

		if (this.XAPI.getSession().length === 0) {
			this.rejectTransaction({ code: 'NODEJS_BE103', explain: 'User is not logged' }, this.transactions[transactionId], false);
		} else {
			this.sendJSON(command, json, transactionId);
		}

		return transactionId;
	}

	public closeConnection() {
		if (this.WebSocket !== null) {
			this.WebSocket.close();
		}
	}

}

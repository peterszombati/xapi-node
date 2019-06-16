import XAPI from "../XAPI";
import {MessageTube} from "../MessageTube";
import {
	TransactionResolveStream,
	TransactionStatus
} from "../../interface/XapiTypeGuard";
import {Time} from "../../modules/Time";
import {WebSocketModule} from "../../modules/WebSocketModule";
import Logger from "../../utils/Logger";

export class StreamConnection extends MessageTube{
	private XAPI: XAPI;
	public status: boolean = false;

	constructor(XAPI: XAPI) {
		super(XAPI.rateLimit);
		this.XAPI = XAPI;
	}

	private handleData(command: string, data: any, time: Time) {
		if (this.listeners[command] === undefined) {
			return;
		}

		this.callListener(command, [data, time]);
	}

	public connect() {
		if (this.XAPI.tryReconnect === false) {
			Logger.log.warn("Stream connect is called when tryReconnect is false");
			return;
		}
		this.WebSocket = new WebSocketModule('wss://' + this.XAPI.getHostname() +'/' + this.XAPI.getAccountType() + "Stream");
		this.WebSocket.onOpen(() => {
			Logger.log.info("Stream open");
			this.handleSocketOpen(new Time());
		});

		this.WebSocket.onClose(() => {
			Logger.log.info("Stream closed");
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

	private setConnection(status: boolean) {
		if ((this.XAPI.isConnectionReady && status === false)
			|| (this.XAPI.Socket.status === true && status === true && this.status === false)) {
			this.status = status;
			this.XAPI.callListener("xapiConnectionChange", [status]);
		} else {
			this.status = status;
		}
	}

	private handleSocketOpen(time: Time) {
		this.setConnection(true);
		this.resetMessageTube();
		if (this.XAPI.getSession().length > 0) {
			this.XAPI.Stream.ping();
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
		this.setConnection(false);
		this.resetMessageTube();
		if (this.XAPI.tryReconnect) {
			setTimeout(() => {
				this.connect();
			}, 2000);
		}
	}

	protected sendCommand(command: string, completion: any = {}, urgent: boolean = false):
		Promise<TransactionResolveStream> {
		return new Promise((resolve, reject) => {
			const transactionId = this.XAPI.createTransactionId();
			const json = JSON.stringify({
				command,
				"streamSessionId": this.XAPI.getSession(),
				...completion
			});
			const transaction = this.addTransaction({
				command,
				isStream: true,
				request: {json, arguments: completion, sent: null},
				response: {json: null, received: null, status: null},
				transactionId,
				createdAt: new Time(),
				status: TransactionStatus.waiting,
				promise: { resolve, reject },
				urgent
			}, transactionId);

			if (this.XAPI.getSession().length === 0) {
				this.rejectTransaction({
					code: 'NODEJS_BE103',
					explain: 'User is not logged'
				}, transaction, false);
			} else {
				this.sendJSON(command, json, transaction);
			}
		});
	}

	public closeConnection() {
		if (this.WebSocket !== null) {
			this.WebSocket.close();
		}
	}

}

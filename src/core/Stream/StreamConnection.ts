import XAPI from "../XAPI";
import {MessageTube} from "../MessageTube";
import {
	TransactionResolveStream,
	TransactionStatus
} from "../../interface/XapiTypeGuard";
import {Time} from "../../modules/Time";
import {WebSocketModule} from "../../modules/WebSocketModule";
import Logger from "../../utils/Logger";
import {errorCode} from "../../enum/errorCode";

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
			Logger.log.hidden("Stream connect is called when tryReconnect is false", "WARN");
			return;
		}
		this.WebSocket = new WebSocketModule('wss://' + this.XAPI.getHostname() +'/' + this.XAPI.getAccountType() + "Stream");
		this.WebSocket.onOpen(() => {
			Logger.log.hidden("Stream open", "INFO");
			this.handleSocketOpen(new Time());
		});

		this.WebSocket.onClose(() => {
			if (this.status === true) {
				Logger.log.hidden("Stream closed", "INFO");
			}
			this.handleSocketClose(new Time());
		});

		this.WebSocket.onMessage((message: any) => {
			try {
				this.handleSocketMessage(JSON.parse(message.toString().trim()), new Time());
			} catch (e) {
				Logger.log.hidden("Stream websocket error\n" + JSON.stringify(e, null, "t"), "ERROR");
			}
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
		if (this.XAPI.getSession().length > 0) {
			this.XAPI.Stream.ping();
			this.XAPI.callListener("xapiReady");
		}
		this.resetMessageTube("Stream");
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
		this.resetMessageTube("Stream");
		if (this.XAPI.tryReconnect) {
			setTimeout(() => {
				this.connect();
			}, 2000);
		}
	}

	protected sendCommand(command: string, completion: any = {}, urgent: boolean = false):
		Promise<TransactionResolveStream> {
		return new Promise((tResolve: any, tReject: any) => {
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
				transactionPromise: { tResolve, tReject },
				urgent
			}, transactionId);

			if (this.status === false) {
				this.rejectTransaction({
					code: errorCode.XAPINODE_1,
					explain: "Stream closed"
				}, transaction, false);
			} else if (this.XAPI.getSession().length === 0) {
				this.rejectTransaction({
					code: errorCode.XAPINODE_BE103,
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

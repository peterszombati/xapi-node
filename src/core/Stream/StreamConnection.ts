import XAPI from "../XAPI";
import {TransactionResolveStream} from "../../interface/Interface";
import {Time} from "../../modules/Time";
import {WebSocketWrapper} from "../../modules/WebSocketWrapper";
import Logger from "../../utils/Logger";
import {errorCode} from "../../enum/errorCode";
import {TransactionStatus, TransactionType} from "../../enum/Enum";
import {Queue} from "../Queue";

export class StreamConnection extends Queue {
	private XAPI: XAPI;
	public session: string = '';

	constructor(XAPI: XAPI) {
		super(XAPI.rateLimit, TransactionType.STREAM);
		this.XAPI = XAPI;
	}

	public connect() {
		if (this.XAPI.tryReconnect === false) {
			Logger.log.hidden("Stream connect is called when tryReconnect is false", "WARN");
			return;
		}
		this.WebSocket = new WebSocketWrapper('wss://' + this.XAPI.hostName +'/' + this.XAPI.accountType + "Stream");
		this.WebSocket.onOpen(() => {
			Logger.log.hidden("Stream open", "INFO");
			this.resetMessageTube();
			this.setConnection(true);
		});

		this.WebSocket.onClose(() => {
			if (this.status === true) {
				Logger.log.hidden("Stream closed", "INFO");
			}
			this.setConnection(false);
			this.resetMessageTube();
			if (this.XAPI.tryReconnect) {
				setTimeout(() => {
					if (this.XAPI.tryReconnect) {
						this.connect();
					}
				}, 2000);
			}
			for (const transactionId in this.transactions) {
				if (this.transactions[transactionId].status === TransactionStatus.waiting) {
					this.rejectTransaction({ code: errorCode.XAPINODE_1, explain: "Stream closed"}, this.transactions[transactionId], false);
				}
			}
		});

		this.WebSocket.onMessage((message: any) => {
			try {
				const json = JSON.parse(message.toString().trim());
				this.lastReceivedMessage.reset();
				this.callListener(json.command, [json.data, new Time()]);
			} catch (e) {
				const { name, message, stack } = new Error(e);
				Logger.log.error("Stream WebSocket Error");
				Logger.log.hidden(name + "\n" + message + (stack ? "\n" + stack : ""), "ERROR");
			}
		});

		this.WebSocket.onError((error: any) => {
			const { name, message, stack } = new Error(error);
			Logger.log.error("Stream WebSocket Error\n" + name + "\n" + message + (stack ? "\n" + stack : ""));
		});
	}

	public onConnectionChange(callBack: (status: boolean) => void, key: string | null = null) {
		this.addListener("connectionChange", callBack, key);
	}

	private setConnection(status: boolean) {
		if (this.status !== status) {
			this.status = status;
			this.callListener("connectionChange", [status]);
		}

		if (this.openTimeout !== null) {
			clearTimeout(this.openTimeout);
		}
		if (status) {
			if (this.session.length > 0) {
				this.ping();
			}
			this.openTimeout = setTimeout(() => {
				this.openTimeout = null;
				if (this.session.length > 0 && this.status) {
					this.XAPI.callListener("xapiReady");
				}
			}, 1000);
		}
	}

	protected sendCommand(command: string, completion: any = {}, urgent: boolean = false):
		Promise<TransactionResolveStream> {
		return new Promise((resolve: any, reject: any) => {
			const transaction = this.addTransaction({
				command,
				json: JSON.stringify({
					...completion,
					command,
					"streamSessionId": this.session,
				}),
				args: completion,
				transactionId: this.createTransactionId(),
				resolve,
				reject,
				urgent
			});
			if (this.status === false) {
				this.rejectTransaction({
					code: errorCode.XAPINODE_1,
					explain: "Stream closed"
				}, transaction);
			} else if (this.session.length === 0) {
				this.rejectTransaction({
					code: errorCode.XAPINODE_BE103,
					explain: 'User is not logged'
				}, transaction);
			} else {
				this.sendJSON(transaction, true);
			}
		});
	}

	public closeConnection() {
		if (this.WebSocket !== null) {
			this.WebSocket.close();
		}
	}

	public ping() {
		return this.sendCommand("ping", {}, true);
	}

	protected sendSubscribe(command: string, completion: any = {}) {
		return this.sendCommand(`get${command}`, completion);
	}

	protected sendUnsubscribe(command: string, completion: any = {}) {
		return this.sendCommand(`stop${command}`, completion);
	}

}

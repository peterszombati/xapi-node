import {
	Transaction,
	TransactionResolveSocket,
	TransactionStatus
} from "../../interface/XapiTypeGuard";
import {MessageTube} from "../MessageTube";
import XAPI from "../XAPI";
import {Time} from "../../modules/Time";
import {WebSocketModule} from "../../modules/WebSocketModule";
import Logger from "../../utils/Logger";

export class SocketConnection extends MessageTube {

	protected XAPI: XAPI;

	public status: boolean = false;
	private _password: string = null;

	constructor(XAPI: XAPI, password: string) {
		super(XAPI.rateLimit);
		this._password = password;
		this.XAPI = XAPI;
	}

	private login() {
		return this.sendCommand('login', {
			'userId': this.XAPI.getAccountID(),
			'password': this._password,
			'appName': this.XAPI.getAppName()
		}, null, true);
	}

	private getInfo(customTag: string): { transactionId: string, command: string } {
		const customTagData = customTag.split('_');
		if (customTagData.length < 2) {
			return { transactionId: null, command: null };
		}
		const command = customTagData[0];
		const transactionId = customTagData[1];

		if (this.transactions[transactionId] === undefined) {
			return { transactionId: null, command };
		}
		return { transactionId, command };
	}

	private handleData(returnData: any, customTag: string, time: Time) {
		const { transactionId, command } = this.getInfo(customTag);

		if (transactionId !== null) {
			this.transactions[transactionId].response = {
				status: true,
				received: time,
				json: returnData
			};

			this.resolveTransaction(returnData, time, this.transactions[transactionId]);

			if (this.listeners[command] !== undefined) {
				this.callListener(command, [returnData, time, this.transactions[transactionId]]);
			} else {
				//TODO: console.error('Unhandled message (customTag = ' + customTag + ')');
			}
		} else {
			//TODO: console.error('Received a message without vaild customTag (customTag = ' + customTag + ')');
		}
	}

	public connect() {
		if (this.XAPI.tryReconnect === false) {
			Logger.log.warn("Socket connect is called when tryReconnect is false");
			return;
		}
		this.WebSocket = new WebSocketModule('wss://' + this.XAPI.getHostname() +'/' + this.XAPI.getAccountType());
		this.WebSocket.onOpen(() => {
			Logger.log.info("Socket open");
			this.handleSocketOpen(new Time());
		});

		this.WebSocket.onClose(() => {
			Logger.log.info("Socket closed");
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
		|| (this.XAPI.Stream.status === true && status === true && this.status === false)) {
			this.status = status;
			this.XAPI.callListener("xapiConnectionChange", [status]);
		} else {
			this.status = status;
		}
	}

	private handleSocketOpen(time: Time) {
		this.setConnection(true);
		this.resetMessageTube();
		this.login().then(() => {
			this.XAPI.Socket.ping();
		});
	}

	private handleSocketClose(time: Time) {
		this.setConnection(false);
		this.resetMessageTube();
		for (const transactionId in this.transactions) {
			const isInterrupted = (this.transactions[transactionId].status === TransactionStatus.sent);
			if (this.transactions[transactionId].status === TransactionStatus.waiting || isInterrupted) {
				this.rejectTransaction({ code: "XAPINODE_1", explain: "Socket closed"}, this.transactions[transactionId], isInterrupted);
			}
		}
		if (this.XAPI.tryReconnect) {
			setTimeout(() => {
				this.connect();
			}, 2000);
		}
	}

	private handleError(code: any, explain: any, customTag: string, time: Time) {
		const { transactionId } = this.getInfo(customTag);

		if (transactionId !== null) {
			this.transactions[transactionId].response = {
				status: false,
				json: { code, explain },
				received: time
			};
			this.rejectTransaction({ code, explain }, this.transactions[transactionId]);
		} else {
			Logger.log.error("Socket error message:\n"
				+ JSON.stringify({ code, explain, customTag }, null, "\t"));
		}
	}

	private handleSocketError(error: any, time: Time) {
		//TODO: console.error(error);
	}

	private handleSocketMessage(message: any, time: Time) {
		this.lastReceivedMessage.reset();
		if (message.streamSessionId !== undefined) {
			this.XAPI.setSession(message.streamSessionId);
			return;
		}
		if (message.status) {
			this.handleData(
				message.returnData,
				typeof(message.customTag) === 'string' ? message.customTag : null,
				time);
		} else if (message.status !== undefined
			&& message.errorCode !== undefined
			&& message.errorDescr !== undefined) {
			const { errorCode, errorDescr, customTag } = message;
			this.handleError(errorCode, errorDescr, customTag, time);
		}
	}

	protected sendCommand<T>(command: string, args: any = {}, transactionId: string = null, urgent: boolean = false):
		Promise<TransactionResolveSocket<T>> {
		return new Promise((resolve, reject: any) => {
			if (transactionId === null) {
				transactionId = this.XAPI.createTransactionId();
			}

			const json = JSON.stringify({
				command,
				arguments: (Object.keys(args).length === 0) ? undefined : args,
				customTag: command + '_' + transactionId });

			const transaction = this.addTransaction({
				command,
				isStream: false,
				request: { json, arguments: args, sent: null },
				response: { json: null, received: null, status: null },
				transactionId,
				createdAt: new Time(),
				status: TransactionStatus.waiting,
				promise: { resolve, reject },
				urgent
			}, transactionId);

			if (this.XAPI.getSession().length === 0
				&& "login" !== command
				&& "ping" !== command
				&& "logout" !== command) {
				this.rejectTransaction({ code: 'XAPINODE_BE103', explain: 'User is not logged' }, transaction, false);
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

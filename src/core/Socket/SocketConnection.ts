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
import {errorCode} from "../../enum/errorCode";

export class SocketConnection extends MessageTube {

	protected XAPI: XAPI;

	public status: boolean = false;

	constructor(XAPI: XAPI) {
		super(XAPI.rateLimit);
		this.XAPI = XAPI;
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
			Logger.log.hidden("Socket connect is called when tryReconnect is false", "WARN");
			return;
		}
		this.WebSocket = new WebSocketModule('wss://' + this.XAPI.getHostname() +'/' + this.XAPI.getAccountType());
		this.WebSocket.onOpen(() => {
			Logger.log.hidden("Socket open", "INFO");
			this.handleSocketOpen(new Time());
		});

		this.WebSocket.onClose(() => {
			Logger.log.hidden("Socket closed", "INFO");
			this.handleSocketClose(new Time());
		});

		this.WebSocket.onMessage((message: any) => {
			try {
				this.handleSocketMessage(JSON.parse(message.toString().trim()), new Time());
			} catch (e) {
				Logger.log.hidden("Socket websocket error\n" + JSON.stringify(e, null, "t"), "ERROR");
			}
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
		this.tryLogin(2);
	}

	private tryLogin(retries: number = 2) {
		this.XAPI.Socket.login().then(() => {
			Logger.log.hidden("Login is successful (userId = " + this.XAPI.getAccountID() + ", accountType = " + this.XAPI.getAccountType() + ")", "INFO");
			this.XAPI.Socket.ping();
		}).catch(e => {
			Logger.log.hidden("Login is rejected (userId = " + this.XAPI.getAccountID() + ", accountType = " + this.XAPI.getAccountType() + ")\nReason:\n" + JSON.stringify(e, null, "\t"), "ERROR");
			if (retries > 0 && e.reason.code !== errorCode.XAPINODE_1 && e.reason.code !== errorCode.BE005) {
				setTimeout(() => {
					Logger.log.hidden("Try to login (retries = " + retries + ")", "INFO");
					this.tryLogin(retries - 1);
				}, 500);
			} else if (e.reason.code === errorCode.BE005) {
				Logger.log.hidden("Disconnect from stream and socket (reason = 'login error code is " + e.reason.code + "')", "INFO");
				this.XAPI.disconnect();
			}
		});
	}

	private handleSocketClose(time: Time) {
		this.setConnection(false);
		this.resetMessageTube();
		for (const transactionId in this.transactions) {
			const isInterrupted = (this.transactions[transactionId].status === TransactionStatus.sent);
			if (this.transactions[transactionId].status === TransactionStatus.waiting || isInterrupted) {
				this.rejectTransaction({ code: errorCode.XAPINODE_1, explain: "Socket closed"}, this.transactions[transactionId], isInterrupted);
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
			Logger.log.hidden("Socket error message:\n"
				+ JSON.stringify({ code, explain, customTag }, null, "\t"), "ERROR");
		}
	}

	private handleSocketError(error: any, time: Time) {
		//TODO: console.error(error);
	}

	private handleSocketMessage(message: any, time: Time) {
		this.lastReceivedMessage.reset();
		if (message.status) {
			this.handleData(
				(message.streamSessionId !== undefined) ?
						{streamSessionId: message.streamSessionId} : message.returnData,
				typeof(message.customTag) === 'string' ?
						message.customTag : null,
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

			if (this.status === false) {
				this.rejectTransaction({
					code: errorCode.XAPINODE_1,
					explain: "Socket closed"
				}, this.transactions[transactionId], false);
			} else if (this.XAPI.getSession().length === 0
				&& "login" !== command
				&& "ping" !== command
				&& "logout" !== command) {
				this.rejectTransaction({ code: errorCode.XAPINODE_BE103, explain: 'User is not logged' }, transaction, false);
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

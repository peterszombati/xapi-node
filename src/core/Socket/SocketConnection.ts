import {TransactionResolveSocket, TransactionStatus, TransactionType} from "../../interface/XapiTypeGuard";
import {MessageTube} from "../MessageTube";
import XAPI from "../XAPI";
import {Time} from "../../modules/Time";
import {WebSocketModule} from "../../modules/WebSocketModule";
import Logger from "../../utils/Logger";
import {errorCode} from "../../enum/errorCode";

export class SocketConnection extends MessageTube {

	protected XAPI: XAPI;

	public status: boolean = false;
	private openTimeout: NodeJS.Timeout | null = null;

	constructor(XAPI: XAPI) {
		super(XAPI.rateLimit, TransactionType.SOCKET);
		this.XAPI = XAPI;
	}

	private getInfo(customTag: string): { transactionId: string | null, command: string | null } {
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

		if (transactionId !== null && command !== null) {
			this.transactions[transactionId].response = {
				status: true,
				received: time,
				json: returnData
			};

			this.resolveTransaction(returnData, time, this.transactions[transactionId]);

			if (this.listeners[command] !== undefined) {
				this.callListener(command, [returnData, time, this.transactions[transactionId]]);
			} else {
				//Logger.log.warn('Unhandled message (customTag = ' + customTag + ')');
			}
		} else {
			Logger.log.error('Received a message without vaild customTag (customTag = ' + customTag + ')');
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
			if (this.status === true) {
				Logger.log.hidden("Socket closed", "INFO");
			}
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

	public onConnectionChange(callBack: (status: boolean) => void, key: string | null = null) {
		this.addListener("connectionChange", callBack, key);
	}

	private setConnection(status: boolean) {
		if (this.status !== status) {
			this.status = status;
			this.callListener("connectionChange", [status]);
		} else {
			this.status = status;
		}

		if (this.openTimeout !== null) {
			clearTimeout(this.openTimeout);
		}
		if (status) {
			this.ping();
			this.openTimeout = setTimeout(() => {
				this.openTimeout = null;
				if (this.status) {
					this.tryLogin(2);
				}
			}, 1000);
		}
	}

	private handleSocketOpen(time: Time) {
		this.resetMessageTube();
		this.setConnection(true);
	}

	private tryLogin(retries: number = 2) {
		this.XAPI.Socket.login().then(() => {
			Logger.log.hidden("Login is successful (userId = " + this.XAPI.getAccountID()
				+ ", accountType = " + this.XAPI.getAccountType() + ")", "INFO");
			this.ping();
		}).catch(e => {
			Logger.log.hidden("Login is rejected (userId = " + this.XAPI.getAccountID()
				+ ", accountType = " + this.XAPI.getAccountType()
				+ ")\nReason:\n" + JSON.stringify(e, null, "\t"), "ERROR");
			if (retries > 0 && e.reason.code !== errorCode.XAPINODE_1 && e.reason.code !== errorCode.BE005) {
				setTimeout(() => {
					Logger.log.hidden("Try to login (retries = " + retries + ")", "INFO");
					this.tryLogin(retries - 1);
				}, 500);
			} else if (e.reason.code === errorCode.BE005) {
				Logger.log.error("Disconnect from stream and socket (reason = 'login error code is " + e.reason.code + "')");
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
				if (this.XAPI.tryReconnect) {
					this.connect();
				}
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

	protected sendCommand<T>(command: string, args: any = {}, transactionId: string | null = null, urgent: boolean = false):
		Promise<TransactionResolveSocket<T>> {
		return new Promise((tResolve: any, tReject: any) => {
			if (transactionId === null) {
				transactionId = this.XAPI.createTransactionId();
			}

			const json = JSON.stringify({
				command,
				arguments: (Object.keys(args).length === 0) ? undefined : args,
				customTag: command + '_' + transactionId });

			const transaction = this.addTransaction({
				command,
				type: TransactionType.SOCKET,
				request: { json, arguments: args, sent: null },
				response: { json: null, received: null, status: null },
				transactionId,
				createdAt: new Time(),
				status: TransactionStatus.waiting,
				transactionPromise: { tResolve, tReject },
				urgent
			}, transactionId);

			if (this.status === false) {
				this.rejectTransaction({
					code: errorCode.XAPINODE_1,
					explain: "Socket closed"
				}, this.transactions[transactionId], false);
			} else if (this.XAPI.Stream.session.length === 0
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

	public ping() {
		return this.sendCommand<null>('ping', {}, null, true );
	}
}

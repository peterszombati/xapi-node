
import {Transaction, TransactionStatus} from "../../interface/XapiTypeGuard";
import {MessageTube} from "../MessageTube";
import XAPI from "../XAPI";
import {Time} from "../../modules/Time";
import {WebSocketModule} from "../../modules/WebSocketModule";

export class SocketConnection extends MessageTube {

	protected XAPI: XAPI;

	public status: boolean = false;

	constructor(XAPI: XAPI) {
		super();
		this.XAPI = XAPI;
	}

	private login() {
		return this.sendCommand('login', {
			'userId': this.XAPI.getAccountID(),
			'password': this.XAPI.getPassword(),
			'appName': this.XAPI.getAppName()
		});
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

		this.WebSocket = new WebSocketModule('wss://ws.xapi.pro/' + this.XAPI.getAccountType());
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
		this.login();
	}

	private handleSocketClose(time: Time) {
		this.status = false;
		this.resetMessageTube();
		for (const transactionId in this.transactions) {
			const isInterrupted = (this.transactions[transactionId].status === TransactionStatus.sent);
			if (this.transactions[transactionId].status === TransactionStatus.waiting || isInterrupted) {
				this.rejectTransaction({ code: "NODEJS1", explain: "Socket closed"}, this.transactions[transactionId], isInterrupted);
			}
		}
		setTimeout(() => {
			this.connect();
		}, 2000);
	}

	private handleError(code: any, explain: any, customTag: string, time: Time) {
		const { transactionId } = this.getInfo(customTag);

		if (transactionId !== null) {
			this.transactions[transactionId].response = {
				status: false,
				json: { code, explain },
				received: new Time()
			};
			this.rejectTransaction({ code, explain }, this.transactions[transactionId]);
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
				typeof(message.customTag) !== 'string' ? null : message.customTag,
				time);
		} else if (message.status !== undefined
			&& message.errorCode !== undefined
			&& message.errorDescr !== undefined) {
			const { errorCode, errorDescr, customTag } = message;
			this.handleError(errorCode, errorDescr, customTag, time);
		}
	}

	protected sendCommand<T>(command: string, args: any = {}, transactionId: string = null):
		Promise<{ returnData: T, time: Time, transaction: Transaction<null> }> {
		return new Promise((resolve, reject) => {
			if (transactionId === null) {
				transactionId = this.XAPI.createTransactionId();
			}

			const customTag = command + '_' + transactionId;
			const json = JSON.stringify({
				command,
				arguments: (Object.keys(args).length === 0) ? undefined : args,
				customTag });

			this.addTransaction<T>({
				command,
				isStream: false,
				request: { json, arguments: args, sent: null },
				response: { json: null, received: null, status: null },
				transactionId,
				createdAt: new Time(),
				status: TransactionStatus.waiting,
				promise: { resolve, reject }
			}, transactionId);

			this.sendJSON(command, json, transactionId);
		});
	}

	public closeConnection() {
		this.WebSocket.close();
	}

}

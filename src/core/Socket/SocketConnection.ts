
import {TransactionStatus} from "../../interface/XapiTypeGuard";
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

	private handleData(data: any, customTag: string, time: Time) {
		const { transactionId, command } = this.getInfo(customTag);

		if (transactionId !== null) {
			this.transactions[transactionId].response.data = data;
			this.transactions[transactionId].response.received = new Time();
			this.transactions[transactionId].status = TransactionStatus.successful;

			if (this.listeners[command] !== undefined) {
				this.callListener(command, [data, time, this.transactions[transactionId]]);
			} else {
				console.error('Unhandled message (customTag = ' + customTag + ')');
			}
		} else {
			console.error('Received a message without vaild customTag (customTag = ' + customTag + ')');
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
			if (this.transactions[transactionId].status === TransactionStatus.waiting) {
				this.transactions[transactionId].status = TransactionStatus.timeout;
			}
		}
		setTimeout(() => {
			this.connect();
		}, 2000);
	}

	private handleError(code: any, explain: any, time: Time) {
		console.error(`code = '${code}' explain = '${explain}' time = '${time.getUTC()}'`);
	}

	private handleSocketError(error: any, time: Time) {
		//console.error(error);
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
			this.handleError(message.errorCode, message.errorDescr, time);
		}
	}

	protected sendCommand(command: string, args: any = {}, transactionId: string = null): string {
		if (transactionId === null) {
			transactionId = this.XAPI.createTransactionId();
		}
		const customTag = command + '_' + transactionId;
		const json = JSON.stringify({
			command,
			arguments: (Object.keys(args).length === 0) ? undefined : args,
			customTag });
		this.addTransaction({
			command,
			isStream: false,
			request: { data: json, arguments: args, sent: null },
			response: { data: null, received: null },
			transactionId,
			createdAt: new Time(),
			status: TransactionStatus.waiting
		}, transactionId);

		this.sendJSON(command, json, transactionId);

		return transactionId;
	}

}

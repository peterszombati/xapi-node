import XAPI from '../XAPI';
import {TransactionResolveStream} from '../../interface/Interface';
import {Time} from '../../modules/Time';
import {WebSocketWrapper} from '../../modules/WebSocketWrapper';
import Log from '../../utils/Log';
import {errorCode} from '../../enum/errorCode';
import {TransactionStatus, TransactionType} from '../../enum/Enum';
import {Queue} from '../Queue';

export class StreamConnection extends Queue {
	private XAPI: XAPI;
	public session: string = '';

	constructor(XAPI: XAPI) {
		super(XAPI.rateLimit, TransactionType.STREAM);
		this.XAPI = XAPI;
	}

	public connect() {
		this.WebSocket = new WebSocketWrapper('wss://' + this.XAPI.hostName +'/' + this.XAPI.accountType + 'Stream');
		this.WebSocket.onOpen(() => {
			this.changeConnection(true);
		});

		this.WebSocket.onClose(() => {
			this.changeConnection(false);
		});

		this.WebSocket.onMessage((message: any) => {
			try {
				const json = JSON.parse(message.toString().trim());
				this.lastReceivedMessage.reset();
				this.callListener('command_' + json.command, [json.data, new Time()]);
			} catch (e) {
				const { name, message, stack } = new Error(e);
				Log.error('Stream WebSocket Error');
				Log.hidden(name + '\n' + message + (stack ? '\n' + stack : ''), 'ERROR');
			}
		});

		this.WebSocket.onError((error: any) => {
			const { name, message, stack } = new Error(error);
			Log.error('Stream WebSocket Error');
			Log.hidden(name + '\n' + message + (stack ? '\n' + stack : ''), 'ERROR');
		});
	}

	public onConnectionChange(callBack: (status: boolean) => void, key: string | null = null) {
		this.addListener('connectionChange', callBack, key);
	}

	private changeConnection(status: boolean) {
		this.resetMessageTube();
		if (this.status !== status) {
			Log.hidden('Stream ' + (status ? 'open' : 'closed'), 'INFO');
			this.status = status;
			this.callListener('connectionChange', [status]);
		}

		if (this.openTimeout !== null) {
			clearTimeout(this.openTimeout);
			this.openTimeout = null;
		}
		if (this.reconnectTimeout !== null) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}

		if (status) {
			if (this.session.length > 0) {
				this.ping();
			}
			this.openTimeout = setTimeout(() => {
				this.openTimeout = null;
				if (this.session.length > 0 && this.status) {
					this.XAPI.callListener('xapiReady');
				}
			}, 1000);
		} else {
			if (this.XAPI.tryReconnect) {
				this.reconnectTimeout = setTimeout(() => {
					this.reconnectTimeout = null;
					if (this.XAPI.tryReconnect) {
						this.connect();
					}
				}, 2000);
			}
			for (const transactionId in this.transactions) {
				if (this.transactions[transactionId].status === TransactionStatus.waiting) {
					this.rejectTransaction({ code: errorCode.XAPINODE_1, explain: 'Stream closed'}, this.transactions[transactionId], false);
				}
			}
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
					'streamSessionId': this.session,
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
					explain: 'Stream closed'
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
		return this.sendCommand('ping', {}, true);
	}

	protected sendSubscribe(command: string, completion: any = {}) {
		return this.sendCommand(`get${command}`, completion);
	}

	protected sendUnsubscribe(command: string, completion: any = {}) {
		return this.sendCommand(`stop${command}`, completion);
	}

}

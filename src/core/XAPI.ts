import Stream from './Stream/Stream';
import Socket from './Socket/Socket';
import {Listener} from '../modules/Listener';
import {Logger4Interface, EmptyLogger} from 'logger4';
import {Log, changeLogger} from '../utils/Log';
import {ConnectionStatus} from '..';
import {TradePositions} from "../interface/Interface";
import Utils from "../utils/Utils";
import {Time} from "../modules/Time";

export const DefaultHostname = 'ws.xtb.com';
export const DefaultRateLimit = 850;

export interface XAPIConfig {
	accountId: string,
	password: string,
	type: string,
	appName ?: string,
	host ?: string | undefined,
	rateLimit ?: number | undefined,
	logger ?: Logger4Interface
	safe ?: boolean
}

export interface XAPIAccount {
	accountId: string,
	type: string,
	appName ?: string | undefined,
	host: string,
	safe: boolean
}

export class XAPI extends Listener {
	public Stream: Stream;
	public Socket: Socket;
    private _rateLimit: number = DefaultRateLimit;
    private _tryReconnect: boolean = false;
	public get rateLimit() { return this._rateLimit; }
	public get tryReconnect() { return this._tryReconnect; }
	private timer: { interval: NodeJS.Timeout[], timeout: NodeJS.Timeout[] } = {
		interval: [],
		timeout: []
	};
	private _positions: {
		value: TradePositions | null, lastUpdated: Time
	} = { value: null, lastUpdated: new Time(false)};
	public get positions() {
		return this._positions;
	}
	protected account: XAPIAccount = {
		type: 'demo',
		accountId: '',
		host: '',
		appName: undefined,
		safe: false
	};

	public getLogger(): Logger4Interface {
		return Log;
	}

	constructor({
		accountId, password, type, appName = undefined,
		host, rateLimit, logger = new EmptyLogger(), safe
	}: XAPIConfig) {
		super();
		changeLogger(logger);
		this._rateLimit = rateLimit === undefined ? DefaultRateLimit : rateLimit;
		this.Socket = new Socket(this, password);
		this.Stream = new Stream(this);
		this.account = {
			type: (type.toLowerCase() === 'real') ? 'real' : 'demo',
			accountId,
			appName,
			host: host === undefined ? DefaultHostname : host,
			safe: safe === undefined ? false : safe
		};
		if (this.account.safe) {
			Log.warn('[TRADING DISABLED] tradeTransaction command is disabled in config (safe = true)');
		}
		this.Stream.onConnectionChange(status => {
			if (status !== ConnectionStatus.CONNECTING) {
				Log.hidden('Stream ' + (status === ConnectionStatus.CONNECTED ? 'open' : 'closed'), 'INFO');

                if (this.Socket.status === ConnectionStatus.CONNECTED) {
                    if (status === ConnectionStatus.CONNECTED && this.Stream.session.length > 0) {
						this.Socket.send.getTrades(true).then(() => {
							this.callListener('xapi_onReady');
						}).catch(e => {
							this.callListener('xapi_onReady');
						});
                    }

                    this.callListener('xapi_onConnectionChange', [status]);
                }
            }
		});
		this.Socket.onConnectionChange(status => {
			if (status !== ConnectionStatus.CONNECTING) {
				Log.hidden('Socket ' + (status === ConnectionStatus.CONNECTED ? 'open' : 'closed'), 'INFO');

                if (status === ConnectionStatus.DISCONNECTED) {
                    this.Stream.session = '';
                    this.stopTimer();
                }
                if (this.Stream.status === ConnectionStatus.CONNECTED) {
                    this.callListener('xapi_onConnectionChange', [status]);
                }
			}
		});

		this.Socket.listen.login((data, time, transaction) => {
			this.session = data.streamSessionId;
		});

		this.Socket.listen.getTrades((data, time) => {
			const obj: TradePositions = {};
			data.forEach(t => {
				obj[t.order] = Utils.formatPosition(t);
			});
			this._positions = { value: obj, lastUpdated: time};
		});

		this.Stream.listen.getTrades((t, time) => {
			if (this._positions.value === null) {
				this._positions.value = {
					[t.order]: Utils.formatPosition(t)
				};
			} else {
				this._positions.value[t.order] = Utils.formatPosition(t);
			}
		});

		this.addListener('xapi_onReady', () => {
			this.stopTimer();
			this.Stream.subscribe.getTrades();
			this.timer.interval.push(setInterval(() => {
				if (this.Socket.status === ConnectionStatus.CONNECTED
					&& !this.Socket.isQueueContains('ping')) {
					this.Socket.ping();
				}
				if (this.Stream.status === ConnectionStatus.CONNECTED
					&& !this.Stream.isQueueContains('ping')) {
					this.Stream.ping();
				}
				this.timer.timeout.push(setTimeout(() => {
					if (this.Socket.status === ConnectionStatus.CONNECTED
						&& !this.Socket.isQueueContains('getServerTime')) {
						this.Socket.send.getServerTime();
					}
				}, 1000));
				this.timer.timeout.push(setTimeout(() => {
					if (this.Socket.status === ConnectionStatus.CONNECTED
						&& !this.Socket.isQueueContains('getTrades')) {
						this.Socket.send.getTrades(true);
					}
				}, 2000));

				this.Socket.rejectOldTransactions();
				this.Stream.rejectOldTransactions();
				if (Object.keys(this.Socket.transactions).length > 20000) {
					this.Socket.removeOldTransactions();
				}
				if (Object.keys(this.Stream.transactions).length > 20000) {
					this.Stream.removeOldTransactions();
				}
			}, 19000));
			this.timer.interval.push(setInterval(() => {
				this.Stream.subscribe.getTrades();
			}, 60000));
			}, 'constructor');
	}

	private stopTimer() {
		this.timer.interval.forEach(i => clearInterval(i));
		this.timer.timeout.forEach(i => clearTimeout(i));
		this.timer = { interval: [], timeout: [] };
	}

	public get accountType(): string | null {
		return this.account.type;
	}

	public get isTradingDisabled(): boolean {
		return this.account.safe;
	}

	public get accountId(): string {
		return this.account.accountId;
	}

	public get appName(): string | undefined {
		return this.account.appName;
	}

	public get hostName(): string {
		return this.account.host;
	}

	public set session(session: string) {
        this.Stream.session = session;
        if (this.Stream.status === ConnectionStatus.CONNECTED && session !== null && session.length > 0) {
            this.Stream.ping();
			this.Socket.send.getTrades(true).then(() => {
				this.callListener('xapi_onReady');
			}).catch(e => {
				this.callListener('xapi_onReady');
			});
		}
	}

	public connect() {
		this._tryReconnect = true;
		this.Stream.connect();
		this.Socket.connect();
	}

	public get isConnectionReady(): boolean {
		return this.Stream.status === ConnectionStatus.CONNECTED && this.Socket.status === ConnectionStatus.CONNECTED;
	}

	public disconnect() {
		return new Promise((resolve, reject) => {
			this.Stream.session = '';
			this._tryReconnect = false;
			this.Stream.closeConnection();
			if (this.Socket.status) {
				this.Socket.logout()
					.catch(() => {})
					.then(() => {
						this.Socket.closeConnection();
						resolve();
					});
			} else {
				this.Socket.closeConnection();
				resolve();
			}
		});
	}

	public onReady(callBack: () => void, key: string | null = null) {
		if (this.Stream.session.length > 0 && this.isConnectionReady) {
			callBack();
		}
		this.addListener('xapi_onReady', callBack, key);
	}

	public onReject(callBack: (err: any) => void, key: string | null = null) {
		this.addListener('xapi_onReject', callBack, key);
	}

	public onConnectionChange(callBack: (status: ConnectionStatus) => void, key: string | null = null) {
		this.addListener('xapi_onConnectionChange', callBack, key);
	}

}

export default XAPI;

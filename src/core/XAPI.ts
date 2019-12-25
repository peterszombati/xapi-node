import Stream from './Stream/Stream';
import Socket from './Socket/Socket';
import {Listener} from '../modules/Listener';
import {EmptyLogger, Logger4Interface} from 'logger4';
import {changeLogger, Log} from '../utils/Log';
import {CMD_FIELD, ConnectionStatus, TYPE_FIELD} from '..';
import {TradePosition, TradePositions} from '../interface/Interface';
import Utils from '../utils/Utils';
import {PositionType} from '../enum/Enum';

export const DefaultHostname = 'ws.xtb.com';
export const DefaultRateLimit = 850;

export interface XAPIConfig {
    accountId: string,
    password: string,
    type: string,
    appName?: string,
    host?: string | undefined,
    rateLimit?: number | undefined,
    logger?: Logger4Interface
    safe?: boolean
}

export interface XAPIAccount {
    accountId: string,
    type: string,
    appName?: string | undefined,
    host: string,
    safe: boolean
}

export class XAPI extends Listener {
    public Stream: Stream;
    public Socket: Socket;
    private _rateLimit: number = DefaultRateLimit;
    private _tryReconnect: boolean = false;
    private _positions: TradePositions = {};
    private timer: { interval: NodeJS.Timeout[], timeout: NodeJS.Timeout[] } = {
        interval: [],
        timeout: []
    };
    protected account: XAPIAccount = {
        type: 'demo',
        accountId: '',
        host: '',
        appName: undefined,
        safe: false
    };

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

    public get rateLimit() {
        return this._rateLimit;
    }

    public get tryReconnect() {
        return this._tryReconnect;
    }

    public get openPositions(): TradePosition[] {
        return this.positions.filter(t => Utils.getPositionType(t) === PositionType.open);
    }

    public get limitPositions(): TradePosition[] {
        return this.positions.filter(t => Utils.getPositionType(t) === PositionType.limit);
    }

    public get positions(): TradePosition[] {
        return Object.values(this._positions)
            .filter(t => t.value !== null
                && (Utils.getPositionType(t.value) === PositionType.limit || Utils.getPositionType(t.value) === PositionType.open))
            .map(t => t.value);
    }

    public get isConnectionReady(): boolean {
        return this.Stream.status === ConnectionStatus.CONNECTED && this.Socket.status === ConnectionStatus.CONNECTED;
    }

    public get isReady(): boolean {
        return this.Stream.status === ConnectionStatus.CONNECTED
            && this.Socket.status === ConnectionStatus.CONNECTED
            && this.Stream.session.length > 0;
    }

    public getLogger(): Logger4Interface {
        return Log;
    }

    constructor({
                    accountId,
                    password,
                    type,
                    appName = undefined,
                    host = undefined,
                    rateLimit = undefined,
                    logger = new EmptyLogger(),
                    safe = undefined
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
            safe: safe === true
        };
        if (this.account.safe) {
            Log.info('[TRADING DISABLED] tradeTransaction command is disabled in config (safe = true)');
        }
        this.Stream.onConnectionChange(status => {
            if (status !== ConnectionStatus.CONNECTING) {
                Log.hidden('Stream ' + (status === ConnectionStatus.CONNECTED ? 'open' : 'closed'), 'INFO');

                if (this.Socket.status === ConnectionStatus.CONNECTED) {
                    if (this.isReady) {
                        this.Stream.ping().catch(e => {
                            Log.error('Stream: ping request failed');
                        });
                        this.Socket.send.getTrades(true).then(() => {
                            if (this.isReady) {
                                this.callListener('xapi_onReady');
                            }
                        }).catch(e => {
                            if (this.isReady) {
                                this.callListener('xapi_onReady');
                            }
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
            Log.hidden('Login is successful (userId = ' + this.accountId
                + ', accountType = ' + this.accountType + ')', 'INFO');
            this.Stream.session = data.streamSessionId;
            if (this.isReady) {
                this.Stream.ping().catch(e => {
                    Log.error('Stream: ping request failed');
                });
                this.Socket.send.getTrades(true).then(() => {
                    if (this.isReady) {
                        this.callListener('xapi_onReady');
                    }
                }).catch(e => {
                    if (this.isReady) {
                        this.callListener('xapi_onReady');
                    }
                });
            }
        });

        this.Socket.listen.getTrades((data, time, transaction) => {
            const {sent} = transaction.request;
            if (sent !== null && sent.elapsedMs() < 1000) {
                const obj: TradePositions = {};
                data.forEach(t => {
                    if (this._positions[t.position] === undefined || this._positions[t.position].value !== null) {
                        obj[t.position] = {
                            value: Utils.formatPosition(t),
                            lastUpdated: sent
                        };
                    }
                });
                Object.values(this._positions).forEach(t => {
                    if (obj[t.position] === undefined && t.value !== null) {
                        if (t.lastUpdated.elapsedMs() <= 1000) {
                            obj[t.position] = t;
                        }
                    }
                });
                this._positions = obj;
            } else {
                Log.info('getTrades transaction (' + transaction.transactionId + ') is ignored')
            }
        });

        this.Stream.listen.getTrades((t, time) => {
            if (t.cmd === CMD_FIELD.BALANCE || t.cmd === CMD_FIELD.CREDIT) {
                return;
            }
            if (t.type === TYPE_FIELD.PENDING
                && t.cmd !== CMD_FIELD.BUY_LIMIT
                && t.cmd !== CMD_FIELD.SELL_LIMIT
                && t.cmd !== CMD_FIELD.BUY_STOP
                && t.cmd !== CMD_FIELD.SELL_STOP) {
                Log.info('Position pending [' + [t.position, t.symbol, TYPE_FIELD[t.type], CMD_FIELD[t.cmd], t.volume].join(', ') + ']');
            } else if (t.state === 'Deleted') {
                if (this._positions[t.position] !== undefined && this._positions[t.position].value !== null) {
                    Log.info('Position deleted [' + [t.position, t.symbol, TYPE_FIELD[t.type], CMD_FIELD[t.cmd], t.volume].join(', ') + ']');
                    this._positions[t.position] = {value: null, lastUpdated: time};
                }
            } else if (this._positions[t.position] === undefined || this._positions[t.position].value !== null) {
                if (this._positions[t.position] !== undefined) {
                    const {value} = this._positions[t.position];
                    if (value) {
                        const changes = Utils.getObjectChanges(value, Utils.formatPosition(t));
                        if (Object.keys(changes).length > 0) {
                            Log.info('Position changed [' + [t.position, t.symbol, TYPE_FIELD[t.type], CMD_FIELD[t.cmd], t.volume].join(', ') + ']:\n'
                                + JSON.stringify(changes, null, '\t'));
                        }
                    }
                } else {
                    Log.info('Position created [' + [t.position, t.symbol, TYPE_FIELD[t.type], CMD_FIELD[t.cmd], t.volume].join(', ') + ']');
                }
                this._positions[t.position] = {value: Utils.formatPosition(t), lastUpdated: time};
            }
        });

        this.onReady(() => {
            this.stopTimer();
            this.Stream.subscribe.getTrades().catch(e => {
                Log.error('Stream: getTrades request failed');
            });
            this.timer.interval.push(setInterval(() => {
                if (this.Socket.status === ConnectionStatus.CONNECTED
                    && !this.Socket.isQueueContains('ping')) {
                    this.Socket.ping().catch(e => {
                        Log.error('Socket: ping request failed');
                    });
                }
                if (this.Stream.status === ConnectionStatus.CONNECTED
                    && !this.Stream.isQueueContains('ping')) {
                    this.Stream.ping().catch(e => {
                        Log.error('Stream: ping request failed');
                    });
                }
                this.timer.timeout.forEach(i => clearTimeout(i));
                this.timer.timeout = [];
                this.timer.timeout.push(setTimeout(() => {
                    if (this.Socket.status === ConnectionStatus.CONNECTED
                        && !this.Socket.isQueueContains('getServerTime')) {
                        this.Socket.send.getServerTime().catch(e => {
                            Log.error('Socket: getServerTime request failed');
                        });
                    }
                }, 1000));
                this.timer.timeout.push(setTimeout(() => {
                    if (this.Socket.status === ConnectionStatus.CONNECTED
                        && !this.Socket.isQueueContains('getTrades')) {
                        this.Socket.send.getTrades(true).catch(e => {
                            Log.error('Socket: getTrades request failed');
                        });
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
                this.Stream.subscribe.getTrades().catch(e => {
                    Log.error('Stream: getTrades request failed');
                });
            }, 60000));
        }, 'constructor');
    }

    private stopTimer() {
        this.timer.interval.forEach(i => clearInterval(i));
        this.timer.timeout.forEach(i => clearTimeout(i));
        this.timer = {interval: [], timeout: []};
    }

    public connect() {
        this._tryReconnect = true;
        this.Stream.connect();
        this.Socket.connect();
    }

    public disconnect() {
        return new Promise((resolve, reject) => {
            this.Stream.session = '';
            this._tryReconnect = false;
            this.Socket.stopTimer();
            this.Stream.stopTimer();
            this.Stream.closeConnection();
            if (this.Socket.status) {
                this.Socket.logout()
                    .catch()
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
        if (this.isReady) {
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

import {Listener} from '../modules/Listener';
import {EmptyLogger, Logger4Interface} from 'logger4';
import {changeLogger, Log} from '../utils/Log';
import {
    CMD_FIELD,
    ConnectionStatus,
    PERIOD_FIELD,
    REQUEST_STATUS_FIELD,
    STREAMING_TRADE_RECORD,
    Time,
    TYPE_FIELD,
    Utils
} from '..';
import {TradePosition, TradePositions, TradeStatus} from '../interface/Interface';
import {CHART_RATE_LIMIT_BY_PERIOD, Currency2Pair, Listeners, PositionType, RelevantCurrencies} from '../enum/Enum';
import {Socket} from './Socket/Socket';
import {Stream} from './Stream/Stream';

export const DefaultHostname = 'ws.xapi.pro';
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
    subscribeTrades?: boolean
}

export interface XAPIAccount {
    accountId: string,
    type: string,
    appName?: string | undefined,
    host: string,
    safe: boolean,
    subscribeTrades: boolean
}

export interface Orders {
    [order: number]: {
        order: number,
        resolve: any,
        reject: any,
        data: TradeStatus | null,
        time: Time
    }
}

export class XAPI extends Listener {
    public Stream: Stream;
    public Socket: Socket;
    private _rateLimit: number = DefaultRateLimit;
    private _tryReconnect: boolean = false;
    private _positions: TradePositions = {};
    private _positionsUpdated: Time | null = null;
    private _serverTime: { timestamp: number, ping: number, received: Time } | null = null;
    private timer: { interval: NodeJS.Timeout[], timeout: NodeJS.Timeout[] } = {
        interval: [],
        timeout: []
    };
    protected account: XAPIAccount;
    public orders: Orders = {};

    public get logger(): Logger4Interface {
        return Log;
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

    public get rateLimit() {
        return this._rateLimit;
    }

    public get tryReconnect() {
        return this._tryReconnect;
    }

    public get isSubscribeTrades() {
        return this.account.subscribeTrades;
    }

    public get openPositions(): TradePosition[] {
        return this.positions.filter(t => t.position_type === PositionType.open);
    }

    public get limitPositions(): TradePosition[] {
        return this.positions.filter(t => t.position_type === PositionType.limit);
    }

    public get positionsUpdated(): Time | null {
        return this._positionsUpdated;
    }

    public get positions(): TradePosition[] {
        return Object.values(this._positions)
            .filter(t => t.value !== null
                && (t.value.position_type === PositionType.limit || t.value.position_type === PositionType.open))
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

    public get serverTime(): number {
        if (this._serverTime === null) {
            return Date.now();
        } else {
            const elapsedMs = this._serverTime.received.elapsedMs();
            return Math.floor(this._serverTime.timestamp + this._serverTime.ping + (elapsedMs === null ? 0 : elapsedMs));
        }
    }

    constructor({
                    accountId,
                    password,
                    type,
                    appName = undefined,
                    host = undefined,
                    rateLimit = undefined,
                    logger = new EmptyLogger(),
                    safe = undefined,
                    subscribeTrades = undefined
                }: XAPIConfig) {
        super();
        changeLogger(logger);
        if (logger.path === null && (typeof window === 'undefined' && typeof module !== 'undefined' && module.exports)) {
            Log.info('Logger path is not defined (this means Logger4 will not saving logs)');
        }

        this._rateLimit = rateLimit === undefined ? DefaultRateLimit : rateLimit;
        this.account = {
            type: (type.toLowerCase() === 'real') ? 'real' : 'demo',
            accountId,
            appName,
            host: host === undefined ? DefaultHostname : host,
            safe: safe === true,
            subscribeTrades: subscribeTrades !== false
        };

        this.Socket = new Socket(this, password);
        this.Stream = new Stream(this);

        if (this.account.safe) {
            Log.info('[TRADING DISABLED] tradeTransaction command is disabled in config (safe = true)');
        }

        this.Stream.onConnectionChange(status => {
            if (status !== ConnectionStatus.CONNECTING) {
                Log.hidden('Stream ' + (status === ConnectionStatus.CONNECTED ? 'open' : 'closed'), 'INFO');

                if (this.Socket.status === ConnectionStatus.CONNECTED) {
                    if (this.isReady) {
                        this.Stream.ping().catch(e => {
                            Log.error('Stream: ping request failed (XAPI.ts:170)');
                        });

                        if (this.isSubscribeTrades) {
                            this.Socket.send.getTrades(true).catch().then(() => {
                                if (this.isReady) {
                                    this.callListener(Listeners.xapi_onReady);
                                }
                            });
                        } else {
                            this.callListener(Listeners.xapi_onReady);
                        }
                    }

                    this.callListener(Listeners.xapi_onConnectionChange, [status]);
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
                    this.callListener(Listeners.xapi_onConnectionChange, [status]);
                }
            }
        });

        this.Socket.listen.login((data, time, transaction) => {
            Log.hidden('Login is successful (userId = ' + this.accountId + ', accountType = ' + this.accountType + ')', 'INFO');
            this.Stream.session = data.streamSessionId;
            if (this.isReady) {
                this.Stream.ping().catch(e => {
                    Log.error('Stream: ping request failed (XAPI.ts:206)');
                });
                this.Socket.send.getTrades(true).catch().then(() => {
                    if (this.isReady) {
                        this.callListener(Listeners.xapi_onReady);
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
                this._positionsUpdated = new Time();
            } else {
                Log.hidden('getTrades transaction (' + transaction.transactionId + ') is ignored')
            }
        });

        this.Stream.listen.getTrades((t, time) => {
            if (t.cmd === CMD_FIELD.BALANCE || t.cmd === CMD_FIELD.CREDIT) {
                this.callListener(Listeners.xapi_onBalanceChange, [t]);
                return;
            }

            if (t.type === TYPE_FIELD.PENDING
                && t.cmd !== CMD_FIELD.BUY_LIMIT
                && t.cmd !== CMD_FIELD.SELL_LIMIT
                && t.cmd !== CMD_FIELD.BUY_STOP
                && t.cmd !== CMD_FIELD.SELL_STOP) {
                this.callListener(Listeners.xapi_onPendingPosition, [Utils.formatPosition(t)]);
            } else if (t.state === 'Deleted') {
                if (this._positions[t.position] !== undefined && this._positions[t.position].value !== null) {
                    this._positions[t.position] = {value: null, lastUpdated: time};
                    this.callListener(Listeners.xapi_onDeletePosition, [Utils.formatPosition(t)]);
                }
            } else if (this._positions[t.position] === undefined || this._positions[t.position].value !== null) {
                if (this._positions[t.position] !== undefined) {
                    const {value} = this._positions[t.position];

                    if (value) {
                        const changes = Utils.getObjectChanges(value, Utils.formatPosition(t));
                        if (Object.keys(changes).length > 0) {
                            this.callListener(Listeners.xapi_onChangePosition, [Utils.formatPosition(t)]);
                        }
                    }
                } else {
                    this.callListener(Listeners.xapi_onCreatePosition, [Utils.formatPosition(t)]);
                }

                this._positions[t.position] = {value: Utils.formatPosition(t), lastUpdated: time};
            }
        });

        this.Socket.listen.getServerTime((data, time, transaction) => {
            if (transaction.response.received !== null && transaction.request.sent !== null) {
                const dif = transaction.response.received.getDifference(transaction.request.sent);

                this._serverTime = {
                    timestamp: data.time,
                    ping: dif,
                    received: transaction.response.received
                };
            }
        });

        this.Stream.listen.getTradeStatus((s, time) => {
            if (s.requestStatus !== REQUEST_STATUS_FIELD.PENDING) {
                const {resolve, reject} = this.orders[s.order] || {};
                delete s.price;
                if (resolve !== undefined && reject !== undefined) {
                    if (s.requestStatus === REQUEST_STATUS_FIELD.ACCEPTED) {
                        resolve(s);
                    } else {
                        reject(s);
                    }
                    delete this.orders[s.order];
                } else {
                    this.orders[s.order] = {
                        order: s.order,
                        reject: undefined,
                        resolve: undefined,
                        data: s,
                        time
                    }
                }
            }
        });

        this.onReady(() => {
            this.stopTimer();
            if (this.isSubscribeTrades) {
                this.Stream.subscribe.getTrades().catch(e => {
                    Log.error('Stream: getTrades request failed (XAPI.ts:311)');
                });
                this.Stream.subscribe.getTradeStatus().catch(e => {
                    Log.error('Stream: getTrades request failed (XAPI.ts:314)');
                });
            }
            this.Socket.send.getServerTime().catch(e => {
                Log.error('Socket: getServerTime request failed (XAPI.ts:318)');
            });
            this.timer.interval.push(setInterval(() => {
                if (this.Socket.status === ConnectionStatus.CONNECTED
                    && !this.Socket.isQueueContains('ping')) {
                    this.Socket.ping().catch(e => {
                        Log.error('Socket: ping request failed (XAPI.ts:324)');
                    });
                }
                if (this.Stream.status === ConnectionStatus.CONNECTED
                    && !this.Stream.isQueueContains('ping')) {
                    this.Stream.ping().catch(e => {
                        Log.error('Stream: ping request failed (XAPI.ts:330)');
                    });
                }
                this.timer.timeout.forEach(i => clearTimeout(i));
                this.timer.timeout = [];
                this.timer.timeout.push(setTimeout(() => {
                    if (this.Socket.status === ConnectionStatus.CONNECTED
                        && !this.Socket.isQueueContains('getServerTime')) {
                        this.Socket.send.getServerTime().catch(e => {
                            Log.error('Socket: getServerTime request failed (XAPI.ts:339)');
                        });
                    }
                }, 1000));
                if (this.isSubscribeTrades) {
                    this.timer.timeout.push(setTimeout(() => {
                        if (this.Socket.status === ConnectionStatus.CONNECTED
                            && !this.Socket.isQueueContains('getTrades')) {
                            this.Socket.send.getTrades(true).catch(e => {
                                Log.error('Socket: getTrades request failed (XAPI.ts:348)');
                            });
                        }
                    }, 2000));
                }
                this.Socket.rejectOldTransactions();
                this.Stream.rejectOldTransactions();
                if (Object.keys(this.Socket.transactions).length > 20000) {
                    this.Socket.removeOldTransactions();
                }
                if (Object.keys(this.Stream.transactions).length > 20000) {
                    this.Stream.removeOldTransactions();
                }
            }, 19000));
            if (this.isSubscribeTrades) {
                this.timer.interval.push(setInterval(() => {
                    this.Stream.subscribe.getTrades().catch(e => {
                        Log.error('Stream: getTrades request failed (XAPI.ts:365)');
                    });
                    this.Stream.subscribe.getTradeStatus().catch(e => {
                        Log.error('Stream: getTrades request failed (XAPI.ts:368)');
                    });
                }, 60000));
            }
            this.timer.interval.push(setInterval(() => {
                if (this.Socket.status === ConnectionStatus.CONNECTED) {
                    Object.values(this.orders).forEach(order => {
                        if (order.time.elapsedMs() > 5000
                            && order.resolve !== undefined
                            && order.reject !== undefined) {
                            this.refreshOrderStatus(order.order)
                        }
                    })
                }
            }, 5100));
        }, 'constructor');
    }

    private refreshOrderStatus(order: number) {
        this.Socket.send.tradeTransactionStatus(order).then(({returnData}) => {
            const {resolve, reject} = this.orders[order] || {};
            if (resolve !== undefined && reject !== undefined && returnData.requestStatus !== REQUEST_STATUS_FIELD.PENDING) {
                const obj = {
                    requestStatus: returnData.requestStatus,
                    order: returnData.order,
                    message: returnData.message,
                    customComment: returnData.customComment
                };
                if (returnData.requestStatus === REQUEST_STATUS_FIELD.ACCEPTED) {
                    resolve(obj);
                } else {
                    reject(obj);
                }
                delete this.orders[order];
            }
        }).catch(e => {
            Log.error(e);
        });
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
            this.stopTimer();
            this.Socket.stopTimer();
            this.Stream.stopTimer();
            this.Stream.closeConnection();
            if (this.Socket.status) {
                this.Socket.logout()
                    .catch()
                    .then(() => {
                        this.Socket.closeConnection();
                        Log.info(this.account.accountId + ' disconnected');
                        resolve();
                    });
            } else {
                this.Socket.closeConnection();
                Log.info(this.account.accountId + ' disconnected');
                resolve();
            }
        });
    }

    public getAccountCurrencyValue(anotherCurrency: RelevantCurrencies): Promise<number> {
        return Currency2Pair[anotherCurrency] === undefined
            ? Promise.reject(anotherCurrency + ' is not relevant currency')
            : Promise.all([
                this.Socket.send.getSymbol(Currency2Pair[anotherCurrency]),
                this.Socket.send.getProfitCalculation(
                    1,
                    CMD_FIELD.BUY,
                    0,
                    Currency2Pair[anotherCurrency],
                    1,
                )
            ]).then((values) => {
                return values[1].returnData.profit / values[0].returnData.contractSize;
            });
    }

    public getPriceHistory({
                               symbol,
                               period = PERIOD_FIELD.PERIOD_M1,
                               ticks = -CHART_RATE_LIMIT_BY_PERIOD[PERIOD_FIELD[period]],
                               startUTC = null
                           }: {
        symbol: string,
        period?: PERIOD_FIELD | undefined,
        ticks?: number,
        startUTC?: number | null
    }): Promise<{ symbol: string, period: PERIOD_FIELD, candles: number[][], digits: number }> {
        return (startUTC !== null
                ? this.Socket.send.getChartLastRequest(period, startUTC, symbol)
                : this.Socket.send.getChartRangeRequest(
                    0,
                    period,
                    this.serverTime,
                    symbol,
                    ticks)
        ).then((data) => {
            return {
                symbol,
                period,
                candles: data.returnData.rateInfos.map((candle) => {
                    return [candle.ctm, candle.open, candle.close + candle.open, candle.low + candle.open, candle.high + candle.open, candle.vol];
                }),
                digits: data.returnData.digits
            }
        });
    }

    public onReady(callBack: () => void, key: string | null = null) {
        if (this.isReady) {
            callBack();
        }
        return this.addListener(Listeners.xapi_onReady, callBack, key);
    }

    public onReject(callBack: (err: any) => void, key: string | null = null) {
        return this.addListener(Listeners.xapi_onReject, callBack, key);
    }

    public onConnectionChange(callBack: (status: ConnectionStatus) => void, key: string | null = null) {
        return this.addListener(Listeners.xapi_onConnectionChange, callBack, key);
    }

    public onCreatePosition(callBack: (position: TradePosition) => void, key: string | null = null) {
        return this.addListener(Listeners.xapi_onCreatePosition, callBack, key);
    }

    public onDeletePosition(callBack: (position: TradePosition) => void, key: string | null = null) {
        return this.addListener(Listeners.xapi_onDeletePosition, callBack, key);
    }

    public onChangePosition(callBack: (position: TradePosition) => void, key: string | null = null) {
        return this.addListener(Listeners.xapi_onChangePosition, callBack, key);
    }

    public onPendingPosition(callBack: (position: TradePosition) => void, key: string | null = null) {
        return this.addListener(Listeners.xapi_onPendingPosition, callBack, key);
    }

    public onBalanceChange(callBack: (data: STREAMING_TRADE_RECORD) => void, key: string | null = null) {
        return this.addListener(Listeners.xapi_onBalanceChange, callBack, key);
    }

}
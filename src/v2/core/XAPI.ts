import {Listener, ListenerChild} from "../utils/Listener"
import {Socket} from "./Socket/Socket"
import {Stream} from "./Stream/Stream"
import {CHART_RATE_LIMIT_BY_PERIOD, CMD_FIELD, Currency2Pair, PERIOD_FIELD, RelevantCurrencies} from "../interface/Enum"
import {SocketConnection} from "./Socket/SocketConnection"
import {StreamConnection} from "./Stream/StreamConnection"
import {Trading} from "./Trading/Trading"
import {Time} from "../utils/Time"
import {Logger} from "../utils/Logger"
import {TradeRecord} from "./TradeRecord"
import {Counter} from "../utils/Counter"

export const DefaultHost = 'ws.xapi.pro'
export const DefaultRateLimit = 850
export type XAPIConfig = {
    accountId: string
    password: string
    accountType?: 'real' | 'demo'
    type?: 'real' | 'demo'
    rateLimit?: number
    host?: string
    appName?: string
    tradingDisabled?: boolean
}

export class XAPI extends Listener {
    public Stream: Stream
    public Socket: Socket
    public trading: Trading
    public logger: Logger
    public counter: Counter
    private _serverTime: {
        timestamp: number
        ping: number
        received: Time
    } | null = null
    public connections: Record<string /* socketId */, { socket: SocketConnection, stream: StreamConnection }> = {}

    constructor(config: XAPIConfig, logger?: Logger, counter?: Counter) {
        super()
        this.logger = logger || new Logger()
        this.counter = counter || new Counter()
        const accountType = config.accountType || config.type || ''
        if (!['real','demo'].includes(accountType)) {
            throw new Error('invalid "accountType" config it should be demo or real')
        }
        if (config.rateLimit === undefined) {
            config.rateLimit = DefaultRateLimit
        }
        if (config.host === undefined) {
            config.host = DefaultHost
        }
        if (config.tradingDisabled === undefined) {
            config.tradingDisabled = false
        }
        this.Socket = new Socket(this, accountType, config.host, config.tradingDisabled, config.accountId, config.password, config.appName)
        this.Stream = new Stream(accountType, config.host, this)
        this.trading = new Trading(this, (listenerId: string, params: any[] = []) => this.callListener(listenerId, params))
        this.Stream.onClose((streamId, connection) => {
            this.logger.debug({ source: 'src/v2/core/XAPI.ts', function: 'constructor', data: {
                    'this.Stream.onClose': { streamId }
                } })
            if (connection.socketId && this.Socket.connections[connection.socketId]) {
                this.Socket.connections[connection.socketId].close()
            }
            delete this.Stream.connections[streamId]
        })
        this.Socket.onClose((socketId, connection) => {
            this.logger.debug({ source: 'src/v2/core/XAPI.ts', function: 'constructor', data: {
                    'this.Socket.onClose': { socketId }
                } })
            if (connection.streamId && this.Stream.connections[connection.streamId]) {
                this.Stream.connections[connection.streamId].close()
            }
            delete this.Socket.connections[socketId]
            delete this.connections[socketId]
        })

        this.Socket.listen.getServerTime((data, time, transaction) => {
            if (transaction?.state?.sent) {
                const dif = time.getDifference(transaction.state.sent)
                this._serverTime = {
                    timestamp: data.time,
                    ping: dif,
                    received: time,
                }
            }
        })
    }

    public get Time(): null | Date {
        if (!this._serverTime) {
            return null
        }
        return new Date(this._serverTime.received.elapsedMs() + this._serverTime.timestamp + this._serverTime.ping)
    }

    public onClose(callback: (params: {
        socket: { socketId: string, connection: SocketConnection | null }
        stream: { streamId: string, connection: StreamConnection | null }
    }) => void): ListenerChild[] {
        return [
            this.Stream.onClose((streamId, connection) => {
                if (connection.socketId && this.Socket.connections[connection.socketId]) {
                    callback({
                        socket: { socketId: connection.socketId, connection: this.Socket.connections[connection.socketId], },
                        stream: { streamId, connection, },
                    })
                } else {
                    callback({
                        socket: { socketId: connection.socketId, connection: null, },
                        stream: { streamId, connection, },
                    })
                }
            }),
            this.Socket.onClose((socketId, connection) => {
                if (connection.streamId && this.Stream.connections[connection.streamId]) {
                    callback({
                        socket: { socketId, connection, },
                        stream: { streamId: connection.streamId, connection: this.Stream.connections[connection.streamId], },
                    })
                } else {
                    callback({
                        socket: { socketId, connection, },
                        stream: { streamId: connection.streamId, connection: null },
                    })
                }
            }),
        ]
    }

    public onTransactionUpdate(callback: (params: {
        key: 'BALANCE' | 'PENDING' | 'DELETE' | 'MODIFY' | 'CREATED',
        trade: TradeRecord,
    }) => void, key: string | null = null): ListenerChild {
        return this.addListener('onTransactionUpdate', callback, key)
    }

    public connect({timeout}: { timeout: number } = {timeout: 15000}): Promise<{socketId: string,streamId: string}> {
        this.logger.debug({ source: 'src/v2/core/XAPI.ts', function: 'connect', data: {
                input: { timeout }
            } })
        if (isNaN(timeout) || timeout < 0) {
            throw new Error('invalid "timeout" parameter')
        }
        return new Promise<{socketId: string,streamId: string}>(async (resolve,reject) => {
            let socketId
            let streamId
            try {
                socketId = await this.Socket.connect(timeout)
                const streamSessionId = (await this.Socket.send.login(socketId)).data?.returnData?.streamSessionId
                if (!streamSessionId) {
                    throw new Error('invalid streamSessionId')
                }
                this.Socket.connections[socketId].loggedIn = true
                const result = await Promise.allSettled([
                    this.trading.positionsUpdated === null ? this.Socket.send.getTrades() : Promise.resolve(undefined),
                    this._serverTime === null ? this.Socket.send.getServerTime() : Promise.resolve(undefined),
                    this.Stream.connect(timeout, streamSessionId, socketId),
                ])
                // @ts-ignore
                if (result[2].value) {
                    // @ts-ignore
                    streamId = result[2].value
                }
                const error = result.some(i => i.status !== 'fulfilled')
                if (error) {
                    // @ts-ignore
                    throw error.reason
                }
                if (!streamId || !this.Stream.connections[streamId]) {
                    throw new Error('Stream not exists after Socket connected')
                }
                if (!this.Socket.connections[socketId]) {
                    throw new Error('Socket not exists after Stream connected')
                }
                this.Socket.connections[socketId].streamId = streamId
                this.logger.debug({ source: 'src/v2/core/XAPI.ts', function: 'connect', data: {
                        created: { socketId, streamId }
                    } })
                this.connections[socketId] = { socket: this.Socket.connections[socketId], stream: this.Stream.connections[socketId] }
                resolve({socketId,streamId})
            } catch (e) {
                reject(e)
                await Promise.allSettled([
                    socketId ? this.Socket.connections[socketId]?.close() : Promise.resolve(),
                    streamId ? this.Stream.connections[streamId]?.close() : Promise.resolve(),
                ])
                this.logger.debug({ source: 'src/v2/core/XAPI.ts', function: 'connect', error: e})
            }
        })
    }

    public getAccountCurrencyValue(anotherCurrency: RelevantCurrencies): Promise<number> {
        return Currency2Pair[anotherCurrency] === undefined
            ? Promise.reject(new Error(anotherCurrency + ' is not relevant currency'))
            : Promise.all([
                this.Socket.send.getSymbol(Currency2Pair[anotherCurrency]),
                this.Socket.send.getProfitCalculation(1, CMD_FIELD.BUY, 0, Currency2Pair[anotherCurrency], 1),
            ]).then(values => {
                return values[1].data.returnData.profit / values[0].data.returnData.contractSize
            })
    }

    public getPriceHistory({
                               symbol,
                               period = PERIOD_FIELD.PERIOD_M1,
                               ticks = null,
                               startUTC = null,
                               socketId = undefined,
                           }: {
        symbol: string
        period?: PERIOD_FIELD | undefined
        ticks?: number | null
        startUTC?: number | null
        socketId?: string | undefined
    }): Promise<{
        symbol: string
        period: PERIOD_FIELD
        candles: {
            timestamp: number
            open: number
            close: number
            low: number
            high: number
            volume: number
        }[]
        digits: number
        json: string
    }> {
        return (
            startUTC !== null && ticks === null
                ? this.Socket.send.getChartLastRequest(period, startUTC, symbol, socketId)
                : this.Socket.send.getChartRangeRequest(
                    0,
                    period,
                    startUTC !== null ? startUTC : new Date().getTime(),
                    symbol,
                    ticks === null ? -CHART_RATE_LIMIT_BY_PERIOD[PERIOD_FIELD[period]] : ticks,
                    socketId,
                )
        ).then(({data}) => ({
            symbol,
            period,
            candles: data.returnData.rateInfos.map(candle => ({
                timestamp: candle.ctm,
                open: Math.round(candle.open),
                close: Math.round(Math.round(candle.close) + Math.round(candle.open)),
                low: Math.round(Math.round(candle.low) + Math.round(candle.open)),
                high: Math.round(Math.round(candle.high) + Math.round(candle.open)),
                volume: candle.vol,
            })),
            digits: data.returnData.digits,
            json: data.json,
        }))
    }

    public disconnect(socketId: string | undefined = undefined): Promise<PromiseSettledResult<any>[]> {
        this.logger.debug({ source: 'src/v2/core/XAPI.ts', function: 'disconnect', data: {
                input: { socketId }
            } })
        const promiseList: Promise<any>[] = []
        if (socketId) {
            for (const i of Object.entries(this.Socket.connections)) {
                if (i[1].socketId === socketId) {
                    promiseList.push(i[1].close())
                    if (i[1].streamId) {
                        for (const k of Object.entries(this.Stream.connections)) {
                            if (k[1].streamId === i[1].streamId) {
                                promiseList.push(k[1].close())
                                break
                            }
                        }
                    }
                    break
                }
            }
        } else {
            for (const i of Object.values(this.Socket.connections)) {
                promiseList.push(i.close())
            }
            for (const i of Object.values(this.Stream.connections)) {
                promiseList.push(i.close())
            }
        }
        return Promise.allSettled(promiseList)
    }
}
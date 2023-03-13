import {Listener, ListenerChild} from "../utils/Listener"
import {Socket} from "./Socket/Socket"
import {Stream} from "./Stream/Stream"
import {CHART_RATE_LIMIT_BY_PERIOD, CMD_FIELD, Currency2Pair, PERIOD_FIELD, RelevantCurrencies} from "../interface/Enum"
import {SocketConnection} from "./Socket/SocketConnection"
import {StreamConnection} from "./Stream/StreamConnection"
import {Trading} from "./Trading/Trading"
import {Time} from "../utils/Time"

export const DefaultHost = 'ws.xapi.pro'
export const DefaultRateLimit = 850
export type XAPIConfig = {
    accountId: string
    password: string
    accountType: 'real' | 'demo'
    rateLimit?: number
    host?: string
    appName?: string
    tradingDisabled?: boolean
}

export class XAPI extends Listener {
    public Stream: Stream
    public Socket: Socket
    public trading: Trading
    private _serverTime: {
        timestamp: number
        ping: number
        received: Time
    } | null = null

    constructor(config: XAPIConfig) {
        super()
        if (config.rateLimit === undefined) {
            config.rateLimit = DefaultRateLimit
        }
        if (config.host === undefined) {
            config.host = DefaultHost
        }
        if (config.tradingDisabled === undefined) {
            config.tradingDisabled = false
        }
        this.Socket = new Socket(config.accountType, config.host, config.tradingDisabled, config.accountId, config.password, config.appName)
        this.Stream = new Stream(config.accountType, config.host)
        this.trading = new Trading(this, this.callListener)
        this.Stream.onClose((streamId, connection) => {
            if (connection.socketId && this.Socket.connections[connection.socketId]) {
                this.Socket.connections[connection.socketId].close()
            }
            delete this.Stream.connections[streamId]
        })
        this.Socket.onClose((socketId, connection) => {
            if (connection.streamId && this.Stream.connections[connection.streamId]) {
                this.Stream.connections[connection.streamId].close()
            }
            delete this.Socket.connections[socketId]
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

    public onClose(callback: (params: {
        socket?: { socketId: string, connection: SocketConnection | null }
        stream?: { streamId: string, connection: StreamConnection | null }
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

    public connect({timeout}: { timeout: number } = {timeout: 15000}): Promise<{socketId: string,streamId: string}> {
        if (isNaN(timeout) || timeout < 0) {
            throw new Error('invalid "timeout" parameter')
        }
        return new Promise<{socketId: string,streamId: string}>(async (resolve,reject) => {
            let socketId
            let streamId
            try {
                socketId = await this.Socket.connect(timeout)
                const streamSessionId = (await this.Socket.send.login(socketId)).data.returnData.streamSessionId
                streamId = await this.Stream.connect(timeout, streamSessionId, socketId)
                if (this.Socket.connections[socketId]) {
                    this.Socket.connections[socketId].streamId = streamId
                } else {
                    throw new Error('Socket not exists after Stream connected')
                }
                resolve({socketId,streamId})
            } catch (e) {
                reject(e)
                try {
                    socketId && await this.Socket.connections[socketId]?.close()
                } catch (e) {}
                try {
                    streamId && await this.Stream.connections[streamId]?.close()
                } catch (e) {}
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
                           }: {
        symbol: string
        period?: PERIOD_FIELD | undefined
        ticks?: number | null
        startUTC?: number | null
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
    }> {
        return (
            startUTC !== null && ticks === null
                ? this.Socket.send.getChartLastRequest(period, startUTC, symbol)
                : this.Socket.send.getChartRangeRequest(
                    0,
                    period,
                    startUTC !== null ? startUTC : new Date().getTime(),
                    symbol,
                    ticks === null ? -CHART_RATE_LIMIT_BY_PERIOD[PERIOD_FIELD[period]] : ticks
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
        }))
    }

    public disconnect(socketId: string | undefined = undefined): Promise<PromiseSettledResult<any>[]> {
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
            for (const i of Object.entries(this.Socket.connections)) {
                promiseList.push(i[1].close())
            }
            for (const i of Object.entries(this.Stream.connections)) {
                promiseList.push(i[1].close())
            }
        }
        return Promise.allSettled(promiseList)
    }
}
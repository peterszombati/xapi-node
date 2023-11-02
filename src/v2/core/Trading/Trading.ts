import {XAPI} from '../XAPI'
import {TradePositions, TradeStatus} from '../../interface/Interface'
import {Time} from '../../utils/Time'
import {OpenPosition} from './OpenPosition'
import {LimitPosition} from './LimitPosition'
import {CMD_FIELD, PositionType, REQUEST_STATUS_FIELD, TYPE_FIELD} from '../../interface/Enum'
import {TradeRecord} from '../TradeRecord'
import {getObjectChanges} from '../../utils/getObjectChanges'
import {Timer} from '../../utils/Timer'
import {
    TRADE_TRANS_INFO,
    TRADE_TRANS_INFO_CLOSE,
    TRADE_TRANS_INFO_DELETE,
    TRADE_TRANS_INFO_MODIFY
} from "../../interface/Definitions"
import {getPositionType} from "../../utils/getPositionType"
import {sleep} from "../../utils/sleep"

export interface Orders {
    [order: number]: {
        order: number
        resolve: ((data: TradeStatus) => void) | undefined
        reject: ((error: any) => void) | undefined
        data: TradeStatus | null
        createdAt: Time
    }
}

export class Trading {
    private XAPI: XAPI
    private _positions: TradePositions | null = null
    private _positionsUpdated: Time | null = null
    public orders: Orders = {}

    constructor(XAPI: XAPI, callListener: (listenerId: string, params: any[]) => void) {
        this.XAPI = XAPI

        this.XAPI.Stream.listen.getTrades((t, time) => {
            if (t.cmd === CMD_FIELD.BALANCE || t.cmd === CMD_FIELD.CREDIT) {
                callListener('onTransactionUpdate', [{
                    key: 'BALANCE',
                    trade: t,
                }])
            } else if (
                t.type === TYPE_FIELD.PENDING &&
                t.cmd !== CMD_FIELD.BUY_LIMIT &&
                t.cmd !== CMD_FIELD.SELL_LIMIT &&
                t.cmd !== CMD_FIELD.BUY_STOP &&
                t.cmd !== CMD_FIELD.SELL_STOP
            ) {
                callListener('onTransactionUpdate', [{
                    key: 'PENDING',
                    trade: new TradeRecord(t),
                }])
            } else if (t.state === 'Deleted') {
                if (!this._positions) {
                    return
                }
                if (this._positions[t.position] !== undefined && this._positions[t.position].value !== null) {
                    this._positions[t.position] = { value: null, lastUpdated: time }
                    callListener('onTransactionUpdate', [{
                        key: 'DELETE',
                        trade: new TradeRecord(t),
                    }])
                }
            } else {
                if (!this._positions) {
                    return
                }
                if (this._positions[t.position] === undefined || this._positions[t.position].value !== null) {
                    if (this._positions[t.position] !== undefined) {
                        const { value } = this._positions[t.position]

                        if (value) {
                            const changes = getObjectChanges(value, new TradeRecord(t))
                            if (Object.keys(changes).length > 0) {
                                callListener('onTransactionUpdate', [{
                                    key: 'MODIFY',
                                    trade: new TradeRecord(t),
                                }])
                            }
                        }
                    } else {
                        callListener('onTransactionUpdate', [{
                            key: 'CREATED',
                            trade: new TradeRecord(t),
                        }])
                    }

                    this._positions[t.position] = { value: new TradeRecord(t), lastUpdated: time }
                }
            }
        })

        this.XAPI.Socket.listen.getTrades((data, time, transaction) => {
            const sent = transaction.state.createdAt

            if (sent && sent.elapsedMs() < 1000) {
                const obj: TradePositions = {}
                for (const t of data) {
                    if (!this._positions || this._positions[t.position] === undefined || this._positions[t.position].value !== null) {
                        obj[t.position] = {
                            value: new TradeRecord(t),
                            lastUpdated: sent,
                        }
                    }
                }

                if (this._positions) {
                    for (const t of Object.values(this._positions)) {
                        if (obj[t.position] === undefined && t.value !== null) {
                            if (t.lastUpdated.elapsedMs() <= 1000) {
                                obj[t.position] = t
                            }
                        }
                    }
                }

                this._positions = obj
                this._positionsUpdated = new Time()
            }
        })

        this.XAPI.Socket.listen.tradeTransactionStatus((returnData, time, transaction) => {
            const {resolve, reject} = this.orders[returnData.order] || {}
            if (
                resolve !== undefined &&
                reject !== undefined &&
                returnData.requestStatus !== REQUEST_STATUS_FIELD.PENDING
            ) {
                delete this.orders[returnData.order]
                if (returnData.requestStatus === REQUEST_STATUS_FIELD.ACCEPTED) {
                    resolve(returnData)
                } else {
                    reject(returnData)
                }
            }
        })

        this.XAPI.Stream.listen.getTradeStatus((s, time) => {
            if (s.requestStatus !== REQUEST_STATUS_FIELD.PENDING) {
                const { resolve, reject } = this.orders[s.order] || {}
                delete s.price
                if (resolve !== undefined && reject !== undefined) {
                    delete this.orders[s.order]
                    if (s.requestStatus === REQUEST_STATUS_FIELD.ACCEPTED) {
                        resolve(s)
                    } else {
                        reject(s)
                    }
                } else {
                    this.orders[s.order] = {
                        order: s.order,
                        reject: undefined,
                        resolve: undefined,
                        data: s,
                        createdAt: time,
                    }
                }
            }
        })

        const t = new Timer()

        this.XAPI.onClose(() => {
            if (Object.values(this.XAPI.Stream.connections).every((c) => c.status === 'DISCONNECTED')) {
                t.clear()
            }
        })

        this.XAPI.Stream.onOpen(() => {
            if (t.isNull() && Object.values(this.XAPI.Socket.connections).some((c) => c.lastReceivedMessage !== null && c.status !== 'DISCONNECTED')) {
                t.setInterval(() => {
                    if (Object.values(this.XAPI.Socket.connections).some((c) => c.lastReceivedMessage !== null && c.status === 'CONNECTED')) {
                        Object.values(this.orders).forEach(order => {
                            if (order.time.elapsedMs() > 5000 && order.resolve !== undefined && order.reject !== undefined) {
                                this.XAPI.Socket.send.tradeTransactionStatus(order.order)
                            }
                        })
                    }
                }, 5100)
            }
        })
    }

    public buy({symbol, volume = 0.01, tp = 0, sl = 0, customComment = null, limit = undefined, expiration = undefined} : {
        symbol: string
        volume: number
        tp ?: number | undefined
        sl ?: number | undefined
        customComment ?: string | null
        limit?: number | undefined
        expiration?: number | undefined
    }) {
        this.XAPI.logger.transaction({ source: 'src/v2/core/Trading/Trading.ts', function: 'buy', data: {
                input: [{symbol,volume,tp,sl,customComment,limit,expiration}],
                state: 'before'
            } })
        return this.tradeTransaction({
            cmd: limit == undefined ? CMD_FIELD.BUY : CMD_FIELD.BUY_LIMIT,
            type: TYPE_FIELD.OPEN,
            order: 0,
            symbol,
            volume,
            tp,
            sl,
            customComment,
            expiration: expiration !== undefined ? expiration : (limit == undefined ? new Date().getTime() + 10000 : new Date().getTime() + 60000 * 60 * 24),
            offset: 0,
            price: limit == undefined ? 1 : limit,
        })
    }

    public sell({symbol, volume = 0.01, tp = 0, sl = 0, customComment = null, limit = undefined, expiration = undefined} : {
        symbol: string,
        volume: number,
        tp ?: number | undefined,
        sl ?: number | undefined,
        customComment ?: string | null
        limit?: number | undefined
        expiration?: number | undefined
    }) {
        this.XAPI.logger.transaction({ source: 'src/v2/core/Trading/Trading.ts', function: 'sell', data: {
                input: [{symbol,volume,tp,sl,customComment,limit,expiration}],
                state: 'before'
            } })
        return this.tradeTransaction({
            cmd: limit == undefined ? CMD_FIELD.SELL : CMD_FIELD.SELL_LIMIT,
            type: TYPE_FIELD.OPEN,
            order: 0,
            symbol,
            volume,
            tp,
            sl,
            customComment,
            expiration: expiration !== undefined ? expiration : (limit == undefined ? new Date().getTime() + 10000 : new Date().getTime() + 60000 * 60 * 24),
            offset: 0,
            price: limit == undefined ? 1 : limit,
        })
    }

    public modify(modify: {
        order: number
        expiration?: number | Date | null | undefined // in case if this is a limit order: null is for remove, undefined is for not change
        offset?: number | null | undefined // null is for remove, undefined is for not change
        price?: number | undefined
        sl?: number | null | undefined // null is for remove, undefined is for not change
        tp?: number | null | undefined // null is for remove, undefined is for not change
        volume?: number
        customComment ?: string | null | undefined
    }) {
        this.XAPI.logger.transaction({ source: 'src/v2/core/Trading/Trading.ts', function: 'modify', data: {
            input: [ modify ],
            state: 'before'
            } })
        const position = this.positions?.find(x => x.position === modify.order)
        if (!position) {
            this.XAPI.logger.transaction({ source: 'src/v2/core/Trading/Trading.ts', function: 'modify', data: {
                    input: [ modify ],
                    result: { error: { message: `position is not found by id (${modify.order})` }},
                    state: 'end'
                } })
            return Promise.reject(new Error(`position is not found by id (${modify.order})`))
        }
        const tp: undefined | number = modify.tp === null ? undefined : (modify.tp === undefined ? position.tp : modify.tp)
        const sl: undefined | number = modify.sl === null ? undefined : (modify.sl === undefined ? position.sl : modify.sl)
        const offset: undefined | number = modify.offset === null ? undefined : (modify.offset === undefined ? position.offset : modify.offset)
        const volume: number = modify.volume === undefined ? position.volume : modify.volume
        const expiration: Date | number | undefined | null= modify.expiration === undefined
            ? (position.position_type === PositionType.limit ? position.expiration : new Date().getTime() + 10000) // TODO serverTime ?
            : (modify.expiration === null ? undefined : modify.expiration)
        return this.tradeTransaction({
            cmd: position.cmd,
            type: TYPE_FIELD.MODIFY,
            symbol: position.symbol,
            tp,
            sl,
            offset,
            expiration: expiration === null ? undefined : expiration,
            order: modify.order,
            price: modify.price === undefined && position.position_type === PositionType.limit ? position.open_price : modify.price,
            customComment: modify.customComment,
            volume,
        })
    }

    public close({order,volume,customComment,expiration}: {
        order: number
        volume?: number | undefined
        customComment?: string | undefined
        expiration?: number | undefined
    }) {
        this.XAPI.logger.transaction({ source: 'src/v2/core/Trading/Trading.ts', function: 'close', data: {
                input: {order,volume,customComment,expiration},
                state: 'before'
            } })
        const trade = this.positions?.find(x => x.position === order)
        if (!trade) {
            this.XAPI.logger.transaction({ source: 'src/v2/core/Trading/Trading.ts', function: 'close', data: {
                    input: {order,volume,customComment,expiration},
                    result: { error: { message: `position is not found by id (${order})` } },
                    state: 'end'
                } })
            return Promise.reject(new Error(`position is not found by id (${order})`))
        }
        const {cmd, symbol} = trade
        return this.tradeTransaction({
            cmd: (cmd === CMD_FIELD.BUY) ? CMD_FIELD.SELL : CMD_FIELD.BUY,
            type: getPositionType(trade) === PositionType.limit ? TYPE_FIELD.DELETE : TYPE_FIELD.CLOSE,
            tp: 0,
            sl: 0,
            offset: 0,
            expiration: expiration === undefined ? new Date().getTime() + 10000 : expiration, // TODO xApi server time ?
            order,
            price: 1.0,
            symbol,
            customComment: !customComment ? '' : customComment,
            volume: (volume === undefined) ? trade.volume : Math.min(volume, trade.volume)
        })
    }

    public get openPositions(): OpenPosition[] | null {
        return this.positions?.filter(t => t.position_type === PositionType.open).map(i => new OpenPosition(this.XAPI, i)) || null
    }

    public get limitPositions(): LimitPosition[] | null {
        return this.positions?.filter(t => t.position_type === PositionType.limit).map(i => new LimitPosition(this.XAPI, i)) || null
    }

    public get positions(): TradeRecord[] | null {
        return this._positions ? Object.values(this._positions)
            .filter(
                t =>
                    t.value !== null &&
                    (t.value.position_type === PositionType.limit || t.value.position_type === PositionType.open)
            )
            .map(t => t.value) : null
    }

    public get positionsUpdated(): Time | null {
        return this._positionsUpdated
    }

    public tradeTransaction(
        tradeTransInfo: TRADE_TRANS_INFO | TRADE_TRANS_INFO_MODIFY | TRADE_TRANS_INFO_CLOSE | TRADE_TRANS_INFO_DELETE
    ) {
        let position = undefined
        if (!tradeTransInfo.cmd || !tradeTransInfo.symbol) {
            if (tradeTransInfo.type === TYPE_FIELD.MODIFY) {
                position = this.positions?.find(p => p.position === tradeTransInfo.order)
                if (position === undefined) {
                    const error = !this.XAPI.Stream.subscribes['TradeStatus']
                        ? `type === MODIFY in tradeTransaction will not work with missing parameters, you should subscribe TradeStatus in stream`
                        : `type === MODIFY in tradeTransaction orderId = ${tradeTransInfo.order} not found, possible open orderIds example: ${(this.positions?.map(p => p.position).slice(0,10) || []).join(',')}${this.positions?.length || 0 > 10 ? ',...': ''}`
                    throw new Error(error)
                }
            }
        }
        const tradeTransInfoParams = {
            cmd: tradeTransInfo.cmd || position?.cmd,
            customComment: tradeTransInfo.customComment,
            expiration: tradeTransInfo.expiration,
            offset: tradeTransInfo.offset,
            order: tradeTransInfo.order,
            price: tradeTransInfo.price,
            sl: tradeTransInfo.sl,
            symbol: tradeTransInfo.symbol || position?.symbol,
            tp: tradeTransInfo.tp,
            type: tradeTransInfo.type,
            volume: tradeTransInfo.volume === undefined
                ? position
                    ? parseFloat(position.volume.toFixed(2))
                    : undefined
                : parseFloat(tradeTransInfo.volume.toFixed(2)),
        }
        return this.XAPI.Socket.send
            // @ts-ignore
            .tradeTransaction(tradeTransInfoParams)
            .then(({data:{returnData,jsonReceived:time}}) => {
                return new Promise(async (resolve,reject) => {
                    const { data } = this.orders[returnData.order] || {}
                    if (data === undefined || data === null) {
                        this.orders[returnData.order] = {
                            order: returnData.order,
                            resolve,
                            reject,
                            data: null,
                            createdAt: time,
                        }

                        if (!this.XAPI.Stream.subscribes['TradeStatus']) {
                            await sleep(499)
                            const r = (await this.XAPI.Socket.send.tradeTransactionStatus(returnData.order)).data
                            const status = r.returnData.requestStatus
                            if (status === REQUEST_STATUS_FIELD.ACCEPTED) {
                                delete this.orders[returnData.order]
                                resolve(r.returnData)
                            } else if (status !== REQUEST_STATUS_FIELD.PENDING) {
                                reject(r.returnData)
                            }
                        }
                    } else {
                        if (data.requestStatus === REQUEST_STATUS_FIELD.ACCEPTED) {
                            delete this.orders[returnData.order]
                            resolve(data)
                        } else if (data.requestStatus === REQUEST_STATUS_FIELD.PENDING) {
                            this.orders[returnData.order].resolve = resolve
                            this.orders[returnData.order].reject = reject
                        } else {
                            reject(data)
                        }
                    }
                })
            })
    }
}
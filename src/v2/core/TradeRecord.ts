import {CMD_FIELD, PositionType} from '../interface/Enum'
import {getPositionType} from '../utils/getPositionType'

export type TradeRecordParams = {
    close_time: number
    close_price?: number | undefined
    closed: boolean
    cmd: CMD_FIELD
    comment: string
    commission: number
    customComment: string
    digits: number
    expiration: number | null
    margin_rate: number
    offset: number
    open_price: number
    open_time: number
    order: number
    order2: number
    position: number
    sl: number
    storage: number
    symbol: string
    tp: number
    volume: number
}

export class TradeRecord {
    public close_time: number

    public close_price: number | undefined
    public closed: boolean
    public cmd: CMD_FIELD
    public comment: string
    public commission: number
    public customComment: string
    public digits: number
    public expiration: number | null
    public margin_rate: number
    public offset: number
    public open_price: number
    public open_time: number
    public order: number
    public order2: number
    public position: number
    public sl: number
    public storage: number
    public symbol: string
    public tp: number
    public volume: number

    constructor(params: TradeRecordParams) {
        this.close_time = params.close_time
        this.closed = params.closed
        this.cmd = params.cmd
        this.comment = params.comment
        this.commission = params.commission
        this.customComment = params.customComment
        this.digits = params.digits
        this.expiration = params.expiration
        this.margin_rate = params.margin_rate
        this.offset = params.offset
        this.open_price = params.open_price
        this.open_time = params.open_time
        this.order = params.order
        this.order2 = params.order2
        this.position = params.position
        this.sl = params.sl
        this.storage = params.storage
        this.symbol = params.symbol
        this.tp = params.tp
        this.volume = params.volume
        this.close_price = this.position_type === PositionType.closed ? params.close_price : undefined
    }

    public get position_type() {
        return getPositionType({cmd: this.cmd, closed: this.closed, close_time: this.close_time})
    }

    valueOf(): TradeRecordParams {
        return {
            close_time: this.close_time,
            close_price: this.close_price,
            closed: this.closed,
            cmd: this.cmd,
            comment: this.comment,
            commission: this.commission,
            customComment: this.customComment,
            digits: this.digits,
            expiration: this.expiration,
            margin_rate: this.margin_rate,
            offset: this.offset,
            open_price: this.open_price,
            open_time: this.open_time,
            order: this.order,
            order2: this.order2,
            position: this.position,
            sl: this.sl,
            storage: this.storage,
            symbol: this.symbol,
            tp: this.tp,
            volume: this.volume,
        }
    }
}
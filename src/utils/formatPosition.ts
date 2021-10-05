import {STREAMING_TRADE_RECORD, TRADE_RECORD, TradePosition} from '..'
import {getPositionType} from './getPositionType'

export function formatPosition(t: STREAMING_TRADE_RECORD | TRADE_RECORD): TradePosition {
  return {
    close_time: t.close_time,
    closed: t.closed,
    cmd: t.cmd,
    comment: t.comment,
    commission: t.commission,
    customComment: t.customComment,
    digits: t.digits,
    expiration: t.expiration,
    margin_rate: t.margin_rate,
    offset: t.offset,
    open_price: t.open_price,
    open_time: t.open_time,
    order: t.order,
    order2: t.order2,
    position: t.position,
    sl: t.sl,
    storage: t.storage,
    symbol: t.symbol,
    tp: t.tp,
    volume: t.volume,
    position_type: getPositionType({cmd: t.cmd, closed: t.closed, close_time: t.close_time})
  }
}
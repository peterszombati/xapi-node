import {XAPI} from '../XAPI'
import {TradeRecord, TradeRecordParams} from '../TradeRecord'
import {TYPE_FIELD} from '../../interface/Enum'

export class LimitPosition extends TradeRecord {
  private XAPI: XAPI

  constructor(XAPI: XAPI, params: TradeRecordParams) {
    super(params)
    this.XAPI = XAPI
  }

  close(customComment = '') {
    return this.XAPI.trading.tradeTransaction({
      order: this.order,
      symbol: this.symbol,
      type: TYPE_FIELD.DELETE,
      customComment: customComment || undefined,
    })
  }

  modify(params: { tp?: number; sl?: number; price?: number; expiration?: number; customComment?: string }) {
    return this.XAPI.trading.tradeTransaction({
      order: this.order,
      type: TYPE_FIELD.MODIFY,
      tp: params.tp,
      sl: params.sl,
      price: params.price,
      expiration: params.expiration,
      customComment: params.customComment,
    })
  }
}
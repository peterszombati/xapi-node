import {XAPI} from '../XAPI'
import {TradeRecord, TradeRecordParams} from '../TradeRecord'
import {TYPE_FIELD} from '../../interface/Enum'

export class OpenPosition extends TradeRecord {
  private XAPI: XAPI

  constructor(XAPI: XAPI, params: TradeRecordParams) {
    super(params)
    this.XAPI = XAPI
  }

  close(volume: number | undefined = undefined, customComment = '') {
    return this.XAPI.trading.tradeTransaction({
      order: this.order,
      type: TYPE_FIELD.CLOSE,
      volume: volume === undefined ? this.volume : volume,
      symbol: this.symbol,
      price: 1,
      customComment: customComment || undefined,
    })
  }

  modify(params: { tp?: number; sl?: number; offset?: number; customComment?: string }) {
    return this.XAPI.trading.tradeTransaction({
      order: this.order,
      type: TYPE_FIELD.MODIFY,
      tp: params.tp,
      sl: params.sl,
      offset: params.offset,
      customComment: params.customComment || undefined,
    })
  }
}
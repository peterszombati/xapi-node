import { XAPI, XAPIConfig } from './v2/core/XAPI'
import { XAPI as XAPIv2 } from './v2/core/XAPI'
export { XAPIv2 }
import {
  CALENDAR_RECORD,
  CHART_LAST_INFO_RECORD,
  CHART_RANGE_INFO_RECORD,
  IB_RECORD,
  NEWS_TOPIC_RECORD,
  QUOTES_RECORD,
  RATE_INFO_RECORD,
  STEP_RECORD,
  STEP_RULE_RECORD,
  STREAMING_BALANCE_RECORD,
  STREAMING_CANDLE_RECORD,
  STREAMING_KEEP_ALIVE_RECORD,
  STREAMING_NEWS_RECORD,
  STREAMING_PROFIT_RECORD,
  STREAMING_TICK_RECORD,
  STREAMING_TRADE_RECORD,
  STREAMING_TRADE_STATUS_RECORD,
  SYMBOL_RECORD,
  TICK_RECORD,
  TRADE_RECORD,
  TRADE_TRANS_INFO,
  TRADING_HOURS_RECORD,
  TRADING_RECORD,
} from './v2/interface/Definitions'
import {
  Candle,
  CHART_RATE_LIMIT_BY_PERIOD,
  CMD_FIELD,
  DAY_FIELD,
  errorCode,
  PERIOD_FIELD,
  REQUEST_STATUS_FIELD,
  STATE_FIELD,
  TYPE_FIELD,
} from './v2/interface/Enum'
import { parseJsonLogin } from './v2/utils/parseJsonLogin'
import { Time } from './v2/utils/Time'
import { TradeStatus } from './v2/interface/Interface'
import { Timer } from './v2/utils/Timer'
import { ListenerChild } from './v2/utils/Listener'
import { OpenPosition } from './v2/core/Trading/OpenPosition'
import { LimitPosition } from './v2/core/Trading/LimitPosition'
import { TradeRecord } from './v2/core/TradeRecord'
import { Logger } from './v2/utils/Logger'
import { Counter } from './v2/utils/Counter'

export default XAPI
export { XAPIConfig }

export {
  CALENDAR_RECORD,
  IB_RECORD,
  NEWS_TOPIC_RECORD,
  STEP_RULE_RECORD,
  SYMBOL_RECORD,
  TRADE_RECORD,
  TRADE_TRANS_INFO,
  TRADING_HOURS_RECORD,
  STREAMING_TRADE_RECORD,
  STREAMING_TICK_RECORD,
  STREAMING_PROFIT_RECORD,
  STREAMING_NEWS_RECORD,
  STREAMING_KEEP_ALIVE_RECORD,
  TRADING_RECORD,
  QUOTES_RECORD,
  TICK_RECORD,
  STEP_RECORD,
  RATE_INFO_RECORD,
  STREAMING_TRADE_STATUS_RECORD,
  STREAMING_CANDLE_RECORD,
  STREAMING_BALANCE_RECORD,
  CHART_LAST_INFO_RECORD,
  CHART_RANGE_INFO_RECORD,
}

export {
  CMD_FIELD,
  DAY_FIELD,
  PERIOD_FIELD,
  TYPE_FIELD,
  STATE_FIELD,
  REQUEST_STATUS_FIELD,
  CHART_RATE_LIMIT_BY_PERIOD,
  Candle,
  errorCode,
}

export { XAPI, parseJsonLogin, Time, Timer, TradeStatus, ListenerChild, OpenPosition, LimitPosition, TradeRecord, Logger, Counter }

export function getContractValue({
  price,
  lot,
  contractSize,
  currency,
  currencyProfit,
}: {
  price: number
  lot: number
  contractSize: number
  currency: string
  currencyProfit: string
}) {
  return lot * contractSize * (currency === currencyProfit ? price : 1)
}

export function getProfit({
  openPrice,
  closePrice,
  isBuy,
  lot,
  contractSize,
}: {
  openPrice: number
  closePrice: number
  isBuy: boolean
  lot: number
  contractSize: number
}) {
  return (isBuy ? closePrice - openPrice : openPrice - closePrice) * lot * contractSize
}
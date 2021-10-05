import {XAPI, XAPIConfig} from './core/XAPI'
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
} from './interface/Definitions'
import {
  Candle,
  CHART_RATE_LIMIT_BY_PERIOD,
  CMD_FIELD,
  ConnectionStatus,
  DAY_FIELD,
  errorCode,
  PERIOD_FIELD,
  REQUEST_STATUS_FIELD,
  STATE_FIELD,
  TYPE_FIELD,
} from './enum/Enum'
import {parseJsonLogin} from './modules/parseJsonLogin'
import {Time} from './modules/Time'
import {TradePosition, TradeStatus} from './interface/Interface'
import {Timer} from './modules/Timer'
import {ListenerChild} from "./modules/Listener"

export default XAPI
export {XAPIConfig}

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
  ConnectionStatus,
  Candle,
  errorCode,
}

export {parseJsonLogin, Time, TradePosition, Timer, TradeStatus, ListenerChild}

export function getContractValue({price, lot, contractSize, currency, currencyProfit}:
  { price: number, lot: number, contractSize: number, currency: string, currencyProfit: string }) {
  return lot * contractSize * ((currency === currencyProfit) ? price : 1)
}

export function getProfit({openPrice, closePrice, isBuy, lot, contractSize}:
  { openPrice: number, closePrice: number, isBuy: boolean, lot: number, contractSize: number }) {
  return (isBuy ? closePrice - openPrice : openPrice - closePrice) * lot * contractSize
}

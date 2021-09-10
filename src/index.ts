import {XAPI, XAPIConfig} from './core/XAPI'

export default XAPI
export {XAPIConfig}

import {
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
} from './interface/Definitions'

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

import {
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
} from './enum/Enum'

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

import {parseJsonLogin} from './modules/parseJsonLogin'
import {Utils} from './utils/Utils'
import {Time} from './modules/Time'
import {TradePosition, TradeStatus} from './interface/Interface'
import {Timer} from './modules/Timer'
import {ListenerChild} from "./modules/Listener"

export {parseJsonLogin, Utils, Time, TradePosition, Timer, TradeStatus, ListenerChild}

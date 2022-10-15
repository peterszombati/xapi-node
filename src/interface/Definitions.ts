import { CMD_FIELD, DAY_FIELD, PERIOD_FIELD, REQUEST_STATUS_FIELD, STATE_FIELD, TYPE_FIELD } from '..'

export interface CHART_RANGE_INFO_RECORD {
  end: number
  period: PERIOD_FIELD
  start: number
  symbol: string
  ticks: number
}

export interface CHART_LAST_INFO_RECORD {
  period: PERIOD_FIELD
  start: number
  symbol: string
}

export interface SYMBOL_RECORD {
  currency: string
  time: number
  swap_rollover3days: number
  marginMaintenance: number
  marginHedged: number
  longOnly: boolean
  timeString: string
  categoryName: 'STC' | 'FX' | 'CRT' | 'ETF' | 'IND' | 'CMD' | string
  lotStep: number
  marginMode: number
  leverage: number
  marginHedgedStrong: boolean
  symbol: string
  quoteId: number
  groupName: string
  percentage: number
  swapShort: number
  tickValue: number
  bid: number
  quoteIdCross: number
  pipsPrecision: number
  swapType: number
  description: string
  precision: number
  trailingEnabled: boolean
  ask: number
  profitMode: number
  exemode: number
  instantMaxVolume: number
  high: number
  swapEnable: boolean
  initialMargin: number
  expiration: number
  spreadTable: number
  currencyPair: boolean
  shortSelling: boolean
  contractSize: number
  spreadRaw: number
  lotMin: number
  lotMax: number
  currencyProfit: string
  stopsLevel: number
  type: number
  starting: number
  stepRuleId: number
  swapLong: number
  low: number
  tickSize: number
}

export interface STREAMING_BALANCE_RECORD {
  balance: number
  credit: number
  equity: number
  margin: number
  marginFree: number
  marginLevel: number
}

export interface STREAMING_CANDLE_RECORD {
  close: number
  ctm: number
  ctmString: string
  high: number
  low: number
  open: number
  quoteId: number
  symbol: string
  vol: number
}

export interface STREAMING_TRADE_STATUS_RECORD {
  customComment: string | null
  message: string | null
  order: number
  price: number | null | undefined
  requestStatus: REQUEST_STATUS_FIELD | null
}

export interface CALENDAR_RECORD {
  country: string
  current: string
  forecast: string
  impact: string
  period: string
  previous: string
  time: number
  title: string
}

export interface RATE_INFO_RECORD {
  close: number
  ctm: number
  ctmString: string
  high: number
  low: number
  open: number
  vol: number
}

export interface IB_RECORD {
  closePrice: number
  login: number
  nominal: number
  openPrice: number
  side: number
  surname: string
  symbol: string
  timestamp: number
  volume: string
}

export interface NEWS_TOPIC_RECORD {
  body: string
  bodylen: number
  key: string
  time: number
  timeString: string
  title: string
}

export interface STEP_RULE_RECORD {
  id: number
  name: string
  steps: STEP_RECORD[]
}

export interface STEP_RECORD {
  fromValue: number
  step: number
}

export interface TICK_RECORD {
  ask: number
  askVolume: number
  bid: number
  bidVolume: number
  high: number
  level: number
  low: number
  spreadRaw: number
  spreadTable: number
  symbol: string
  timestamp: number
}

export interface TRADING_HOURS_RECORD {
  quotes: QUOTES_RECORD[]
  symbol: string
  trading: TRADING_RECORD[]
}

export interface QUOTES_RECORD {
  day: DAY_FIELD
  fromT: number
  toT: number
}

export interface TRADING_RECORD {
  day: DAY_FIELD
  fromT: number
  toT: number
}

export interface TRADE_TRANS_INFO {
  cmd: CMD_FIELD
  customComment: string | null
  expiration: number | Date
  offset: number
  order: number
  price: number
  sl: number
  symbol: string
  tp: number
  type: TYPE_FIELD
  volume: number
}

export interface TRADE_TRANS_INFO_MODIFY {
  cmd?: CMD_FIELD
  customComment?: string | null
  expiration?: number | Date
  offset?: number
  order?: number
  price?: number
  sl?: number
  symbol?: string
  tp?: number
  type: TYPE_FIELD.MODIFY
  volume?: number
}

export interface TRADE_TRANS_INFO_CLOSE {
  cmd?: CMD_FIELD
  customComment?: string | null
  expiration?: number | Date
  offset?: number
  order: number
  price: number
  sl?: number
  symbol: string
  tp?: number
  type: TYPE_FIELD.CLOSE
  volume: number
}

export interface TRADE_TRANS_INFO_DELETE {
  cmd?: CMD_FIELD
  customComment?: string | null
  expiration?: number | Date
  offset?: number
  order: number
  price?: number
  sl?: number
  symbol: string
  tp?: number
  type: TYPE_FIELD.DELETE
  volume?: number
}

export interface STREAMING_KEEP_ALIVE_RECORD {
  timestamp: number
}

export interface STREAMING_NEWS_RECORD {
  body: string
  key: string
  time: number
  title: string
}

export interface STREAMING_PROFIT_RECORD {
  order: number
  order2: number
  position: number
  profit: number
}

export interface STREAMING_TICK_RECORD {
  ask: number
  askVolume: number
  bid: number
  bidVolume: number
  high: number
  level: number
  low: number
  quoteId: number
  spreadRaw: number
  spreadTable: number
  symbol: string
  timestamp: number
}

export interface TRADE_RECORD {
  close_price: number
  close_time: number
  closed: boolean
  cmd: CMD_FIELD
  comment: string
  commission: number
  customComment: string
  digits: number
  expiration: number
  margin_rate: number
  offset: number
  open_price: number
  open_time: number
  order: number
  order2: number
  position: number
  profit: number
  sl: number
  storage: number
  symbol: string
  tp: number
  volume: number

  timestamp?: number
  open_timeString?: string
  close_timeString?: string
  expirationString?: string

  type?: TYPE_FIELD
  state?: STATE_FIELD
}

export interface STREAMING_TRADE_RECORD {
  close_price: number
  close_time: number
  closed: boolean
  cmd: CMD_FIELD
  comment: string
  commission: number
  customComment: string
  digits: number
  expiration: number
  margin_rate: number
  offset: number
  open_price: number
  open_time: number
  order: number
  order2: number
  position: number
  profit: number
  sl: number
  storage: number
  symbol: string
  tp: number
  volume: number

  type: TYPE_FIELD
  state: STATE_FIELD
}

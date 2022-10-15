// xapi
export enum REQUEST_STATUS_FIELD {
  ERROR = 0,
  PENDING = 1,
  ACCEPTED = 3,
  REJECTED = 4,
}

export enum DAY_FIELD {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 7,
}

export enum CMD_FIELD {
  BUY = 0,
  SELL = 1,
  BUY_LIMIT = 2,
  SELL_LIMIT = 3,
  BUY_STOP = 4,
  SELL_STOP = 5,
  BALANCE = 6,
  CREDIT = 7,
}

export enum TYPE_FIELD {
  OPEN = 0,
  PENDING = 1,
  CLOSE = 2,
  MODIFY = 3,
  DELETE = 4,
}

export enum STATE_FIELD {
  MODIFIED = 'Modified',
  DELETED = 'Deleted',
}

export enum PERIOD_FIELD {
  PERIOD_M1 = 1,
  PERIOD_M5 = 5,
  PERIOD_M15 = 15,
  PERIOD_M30 = 30,
  PERIOD_H1 = 60,
  PERIOD_H4 = 240,
  PERIOD_D1 = 1440,
  PERIOD_W1 = 10080,
  PERIOD_MN1 = 43200,
}

// xapi-node
export const CHART_RATE_LIMIT_BY_PERIOD: any = {
  PERIOD_M1: 28800, // 1 month
  PERIOD_M5: 17280, // 3 month
  PERIOD_M15: 5760, // 3 month
  PERIOD_M30: 6720, // 7 month
  PERIOD_H1: 3360, // 7 month
  PERIOD_H4: 1560, // 13 month
  PERIOD_D1: 19200, // 52 years
  PERIOD_W1: 3840, // 73 years
  PERIOD_MN1: 960, // 80 years
}

export enum TransactionStatus {
  waiting = 0,
  sent = 1,
  successful = 2,
  timeout = 3,
  interrupted = 4,
}

export enum TransactionType {
  SOCKET = 'Socket',
  STREAM = 'Stream',
}

export enum ConnectionStatus {
  DISCONNECTED,
  CONNECTING,
  CONNECTED,
}

export enum PositionType {
  open = 0,
  closed = 1,
  limit = 2,
  source = 3,
}

export enum Candle {
  timestamp = 0,
  open = 1,
  close = 2,
  low = 3,
  high = 4,
  volume = 5,
}

export enum errorCode {
  XAPINODE_0 = 'XAPINODE_0', // Each command invocation should not contain more than 1kB of data.
  XAPINODE_1 = 'XAPINODE_1', // WebSocket closed
  XAPINODE_2 = 'XAPINODE_2', // messageQueues exceeded 150 size limit
  XAPINODE_3 = 'XAPINODE_3', // Transaction timeout (60s)
  XAPINODE_4 = 'XAPINODE_4', // Trading disabled
  XAPINODE_BE103 = 'XAPINODE_BE103', // User is not logged
  BE005 = 'BE005', // "userPasswordCheck: Invalid login or password"
  BE118 = 'BE118', // User already logged
}

export enum Listeners {
  xapi_onCreatePosition = 'xapi_onCreatePosition',
  xapi_onDeletePosition = 'xapi_onDeletePosition',
  xapi_onChangePosition = 'xapi_onChangePosition',
  xapi_onPendingPosition = 'xapi_onPendingPosition',
  xapi_onBalanceChange = 'xapi_onBalanceChange',
  xapi_onConnectionChange = 'xapi_onConnectionChange',
  xapi_onReject = 'xapi_onReject',
  xapi_onReady = 'xapi_onReady',
}

export const Currency2Pair: any = {
  HUF: 'EURHUF',
  USD: 'EURUSD',
  JPY: 'USDJPY',
  GBP: 'EURGBP',
  TRY: 'EURTRY',
  CHF: 'USDCHF',
  CZK: 'USDCZK',
  BRL: 'USDBRL',
  PLN: 'USDPLN',
  MXN: 'USDMXN',
  ZAR: 'USDZAR',
  RON: 'USDRON',
  AUD: 'EURAUD',
  CAD: 'USDCAD',
  SEK: 'USDSEK',
  NOK: 'EURNOK',
  NZD: 'EURNZD',
  EUR: 'DE30',
  CLP: 'USDCLP',
  DKK: 'VWS.DK_4',
  BTC: 'XEMBTC',
  ETH: 'TRXETH',
}

export type RelevantCurrencies =
  | 'HUF'
  | 'USD'
  | 'JPY'
  | 'GBP'
  | 'TRY'
  | 'CHF'
  | 'CZK'
  | 'BRL'
  | 'PLN'
  | 'MXN'
  | 'ZAR'
  | 'RON'
  | 'AUD'
  | 'CAD'
  | 'SEK'
  | 'NOK'
  | 'NZD'
  | 'EUR'
  | 'CLP'
  | 'DKK'
  | 'BTC'
  | 'ETH'

import {
  STREAMING_BALANCE_RECORD,
  STREAMING_CANDLE_RECORD,
  STREAMING_KEEP_ALIVE_RECORD,
  STREAMING_NEWS_RECORD,
  STREAMING_PROFIT_RECORD,
  STREAMING_TICK_RECORD,
  STREAMING_TRADE_RECORD,
  STREAMING_TRADE_STATUS_RECORD,
  Time,
} from '../../../index'
import { StreamConnection } from './StreamConnection'
import { XAPI } from '../XAPI'

interface StreamListen<T> {
  (data: T, time: Time, jsonString: string): void
}

export class Stream extends StreamConnection {
  public listen = {
    getBalance: (callBack: StreamListen<STREAMING_BALANCE_RECORD>, key: string | null = null) =>
      this.addListener('command_' + 'balance', callBack, key),
    getCandles: (callBack: StreamListen<STREAMING_CANDLE_RECORD>, key: string | null = null) =>
      this.addListener('command_' + 'candle', callBack, key),
    getKeepAlive: (callBack: StreamListen<STREAMING_KEEP_ALIVE_RECORD>, key: string | null = null) =>
      this.addListener('command_' + 'keepAlive', callBack, key),
    getNews: (callBack: StreamListen<STREAMING_NEWS_RECORD>, key: string | null = null) =>
      this.addListener('command_' + 'news', callBack, key),
    getProfits: (callBack: StreamListen<STREAMING_PROFIT_RECORD>, key: string | null = null) =>
      this.addListener('command_' + 'profit', callBack, key),
    getTickPrices: (callBack: StreamListen<STREAMING_TICK_RECORD>, key: string | null = null) =>
      this.addListener('command_' + 'tickPrices', callBack, key),
    getTrades: (callBack: StreamListen<STREAMING_TRADE_RECORD>, key: string | null = null) =>
      this.addListener('command_' + 'trade', callBack, key),
    getTradeStatus: (callBack: StreamListen<STREAMING_TRADE_STATUS_RECORD>, key: string | null = null) =>
      this.addListener('command_' + 'tradeStatus', callBack, key),
  }
  public subscribe = {
    getBalance: () => this.sendSubscribe('Balance'),
    getCandles: (symbol: string) => this.sendSubscribe('Candles', { symbol }),
    getKeepAlive: () => this.sendSubscribe('KeepAlive'),
    getNews: () => this.sendSubscribe('News'),
    getProfits: () => this.sendSubscribe('Profits'),
    getTickPrices: (symbol: string, minArrivalTime = 0, maxLevel = 6) =>
      this.sendSubscribe('TickPrices', { symbol, minArrivalTime, maxLevel }),
    getTrades: () => this.sendSubscribe('Trades'),
    getTradeStatus: () => this.sendSubscribe('TradeStatus'),
  }
  public unSubscribe = {
    getBalance: () => this.sendUnsubscribe('Balance'),
    getCandles: (symbol: string) => this.sendUnsubscribe('Candles', { symbol }),
    getKeepAlive: () => this.sendUnsubscribe('KeepAlive'),
    getNews: () => this.sendUnsubscribe('News'),
    getProfits: () => this.sendUnsubscribe('Profits'),
    getTickPrices: (symbol: string) => this.sendUnsubscribe('TickPrices', { symbol }),
    getTrades: () => this.sendUnsubscribe('Trades'),
    getTradeStatus: () => this.sendUnsubscribe('TradeStatus'),
  }

  constructor(XAPI: XAPI) {
    super(XAPI, 'wss://' + XAPI.hostName + '/' + XAPI.accountType + 'Stream')
  }
}
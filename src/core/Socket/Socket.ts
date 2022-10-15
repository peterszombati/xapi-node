import {
  CALENDAR_RECORD,
  CMD_FIELD,
  IB_RECORD,
  NEWS_TOPIC_RECORD,
  PERIOD_FIELD,
  REQUEST_STATUS_FIELD,
  STEP_RULE_RECORD,
  SYMBOL_RECORD,
  Time,
  TRADE_RECORD,
  TRADE_TRANS_INFO,
  TRADING_HOURS_RECORD,
  TYPE_FIELD,
} from '../..'
import { TradeStatus, Transaction } from '../../interface/Interface'
import {
  getChartRequestResponse,
  getCommissionDefResponse,
  getCurrentUserDataResponse,
  getMarginLevelResponse,
  getMarginTradeResponse,
  getProfitCalculationResponse,
  getServerTimeResponse,
  getTickPricesResponse,
  getVersionResponse,
  tradeTransactionResponse,
  tradeTransactionStatusResponse,
} from '../../interface/Response'
import {
  getCommissionDef,
  getIbsHistory,
  getMarginTrade,
  getNews,
  getProfitCalculation,
  getSymbol,
  getTickPrices,
  getTradeRecords,
  getTrades,
  getTradesHistory,
  getTradingHours,
  tradeTransaction,
  tradeTransactionStatus,
} from '../../interface/Request'
import { SocketConnection } from './SocketConnection'
import { XAPI } from '../XAPI'
import { TRADE_TRANS_INFO_MODIFY, TRADE_TRANS_INFO_CLOSE, TRADE_TRANS_INFO_DELETE } from '../../interface/Definitions'

interface SocketListen<T> {
  (data: T, time: Time, transaction: Transaction<null, null>, jsonString: string): void
}

export class Socket extends SocketConnection {
  public listen = {
    getAllSymbols: (callBack: SocketListen<SYMBOL_RECORD[]>, key: string | null = null) =>
      this.addListener('command_' + 'getAllSymbols', callBack, key),
    getCalendar: (callBack: SocketListen<CALENDAR_RECORD[]>, key: string | null = null) =>
      this.addListener('command_' + 'getCalendar', callBack, key),
    getChartLastRequest: (callBack: SocketListen<getChartRequestResponse>, key: string | null = null) =>
      this.addListener('command_' + 'getChartLastRequest', callBack, key),
    getChartRangeRequest: (callBack: SocketListen<getChartRequestResponse>, key: string | null = null) =>
      this.addListener('command_' + 'getChartRangeRequest', callBack, key),
    getCommissionDef: (callBack: SocketListen<getCommissionDefResponse>, key: string | null = null) =>
      this.addListener('command_' + 'getCommissionDef', callBack, key),
    getCurrentUserData: (callBack: SocketListen<getCurrentUserDataResponse>, key: string | null = null) =>
      this.addListener('command_' + 'getCurrentUserData', callBack, key),
    getIbsHistory: (callBack: SocketListen<IB_RECORD[]>, key: string | null = null) =>
      this.addListener('command_' + 'getIbsHistory', callBack, key),
    getMarginLevel: (callBack: SocketListen<getMarginLevelResponse>, key: string | null = null) =>
      this.addListener('command_' + 'getMarginLevel', callBack, key),
    getMarginTrade: (callBack: SocketListen<getMarginTradeResponse>, key: string | null = null) =>
      this.addListener('command_' + 'getMarginTrade', callBack, key),
    getNews: (callBack: SocketListen<NEWS_TOPIC_RECORD[]>, key: string | null = null) =>
      this.addListener('command_' + 'getNews', callBack, key),
    getProfitCalculation: (callBack: SocketListen<getProfitCalculationResponse>, key: string | null = null) =>
      this.addListener('command_' + 'getProfitCalculation', callBack, key),
    getServerTime: (callBack: SocketListen<getServerTimeResponse>, key: string | null = null) =>
      this.addListener('command_' + 'getServerTime', callBack, key),
    getStepRules: (callBack: SocketListen<STEP_RULE_RECORD[]>, key: string | null = null) =>
      this.addListener('command_' + 'getStepRules', callBack, key),
    getSymbol: (callBack: SocketListen<SYMBOL_RECORD>, key: string | null = null) =>
      this.addListener('command_' + 'getSymbol', callBack, key),
    getTickPrices: (callBack: SocketListen<getTickPricesResponse>, key: string | null = null) =>
      this.addListener('command_' + 'getTickPrices', callBack, key),
    getTradeRecords: (callBack: SocketListen<TRADE_RECORD[]>, key: string | null = null) =>
      this.addListener('command_' + 'getTradeRecords', callBack, key),
    getTrades: (callBack: SocketListen<TRADE_RECORD[]>, key: string | null = null) =>
      this.addListener('command_' + 'getTrades', callBack, key),
    getTradesHistory: (callBack: SocketListen<TRADE_RECORD[]>, key: string | null = null) =>
      this.addListener('command_' + 'getTradesHistory', callBack, key),
    getTradingHours: (callBack: SocketListen<TRADING_HOURS_RECORD[]>, key: string | null = null) =>
      this.addListener('command_' + 'getTradingHours', callBack, key),
    getVersion: (callBack: SocketListen<getVersionResponse>, key: string | null = null) =>
      this.addListener('command_' + 'getVersion', callBack, key),
    tradeTransaction: (callBack: SocketListen<tradeTransactionResponse>, key: string | null = null) =>
      this.addListener('command_' + 'tradeTransaction', callBack, key),
    tradeTransactionStatus: (callBack: SocketListen<tradeTransactionStatusResponse>, key: string | null = null) =>
      this.addListener('command_' + 'tradeTransactionStatus', callBack, key),
    ping: (callBack: SocketListen<any>, key: string | null = null) =>
      this.addListener('command_' + 'ping', callBack, key),
    login: (callBack: SocketListen<{ streamSessionId: string }>, key: string | null = null) =>
      this.addListener('command_' + 'login', callBack, key),
  }
  public send = {
    getAllSymbols: () => this.sendCommand<SYMBOL_RECORD[]>('getAllSymbols'),
    getCalendar: () => this.sendCommand<CALENDAR_RECORD[]>('getCalendar'),
    getChartLastRequest: (period: PERIOD_FIELD, start: number, symbol: string) =>
      this.sendCommand<getChartRequestResponse>('getChartLastRequest', {
        info: {
          period,
          start,
          symbol,
        },
      }),
    getChartRangeRequest: (end: number, period: PERIOD_FIELD, start: number, symbol: string, ticks = 0) =>
      this.sendCommand<getChartRequestResponse>('getChartRangeRequest', {
        info: {
          end,
          period,
          start,
          symbol,
          ticks,
        },
      }),
    getCommissionDef: (symbol: string, volume: number) =>
      this.sendCommand<getCommissionDefResponse>('getCommissionDef', {
        symbol,
        volume,
      }),
    getCurrentUserData: () => this.sendCommand<getCurrentUserDataResponse>('getCurrentUserData'),
    getIbsHistory: (start: number, end: number) =>
      this.sendCommand<IB_RECORD[]>('getIbsHistory', {
        end,
        start,
      }),
    getMarginLevel: () => this.sendCommand<getMarginLevelResponse>('getMarginLevel'),
    getMarginTrade: (symbol: string, volume: number) =>
      this.sendCommand<getMarginTradeResponse>('getMarginTrade', {
        symbol,
        volume,
      }),
    getNews: (start: number, end: number) =>
      this.sendCommand<NEWS_TOPIC_RECORD[]>('getNews', {
        start,
        end,
      }),
    getProfitCalculation: (closePrice: number, cmd: CMD_FIELD, openPrice: number, symbol: string, volume: number) =>
      this.sendCommand<getProfitCalculationResponse>('getProfitCalculation', {
        closePrice,
        cmd,
        openPrice,
        symbol,
        volume,
      }),
    getServerTime: () => this.sendCommand<getServerTimeResponse>('getServerTime', {}, null, true),
    getStepRules: () => this.sendCommand<STEP_RULE_RECORD[]>('getStepRules'),
    getSymbol: (symbol: string) =>
      this.sendCommand<SYMBOL_RECORD>('getSymbol', {
        symbol,
      }),
    getTickPrices: (symbols: string[], timestamp = 0, level = -1) =>
      this.sendCommand<getTickPricesResponse>('getTickPrices', {
        level,
        symbols,
        timestamp,
      }),
    getTradeRecords: (orders: number[]) =>
      this.sendCommand<TRADE_RECORD[]>('getTradeRecords', {
        orders,
      }),
    getTrades: (openedOnly = true) =>
      this.sendCommand<TRADE_RECORD[]>('getTrades', {
        openedOnly,
      }),
    getTradesHistory: (start: number, end: number) =>
      this.sendCommand<TRADE_RECORD[]>('getTradesHistory', {
        end,
        start,
      }),
    getTradingHours: (symbols: string[]) => this.sendCommand<TRADING_HOURS_RECORD[]>('getTradingHours', { symbols }),
    getVersion: () => this.sendCommand<getVersionResponse>('getVersion'),
    tradeTransaction: (
      tradeTransInfo: TRADE_TRANS_INFO | TRADE_TRANS_INFO_MODIFY | TRADE_TRANS_INFO_CLOSE | TRADE_TRANS_INFO_DELETE
    ): Promise<TradeStatus> => {
      const { customComment, expiration, cmd, offset, order, price, sl, symbol, tp, type, volume } = tradeTransInfo
      return new Promise((resolve, reject) => {
        const position = type === TYPE_FIELD.MODIFY ? this.XAPI.positions.find(p => p.position === order) : undefined
        if (type === TYPE_FIELD.MODIFY && position === undefined) {
          const error = !this.XAPI.isSubscribeTrades
            ? 'type === MODIFY in tradeTransaction will not work with missing parameters and subscribeTrades = false, ' +
              'you should set subscribeTrades = true in login config'
            : 'type === MODIFY in tradeTransaction orderId = ' +
              order +
              ' not found,' +
              ' possible open orderIds: ' +
              this.XAPI.positions.map(p => p.position).join(',')
          if (cmd === undefined) {
            return Promise.reject(new Error(error))
          } else {
            this.XAPI.logger.error(new Error(error))
          }
        }
        const transactionId = this.createTransactionId()
        return this.sendCommand<tradeTransactionResponse>(
          'tradeTransaction',
          {
            tradeTransInfo: {
              cmd: position ? cmd || position.cmd : cmd,
              customComment: !customComment ? 'x' + transactionId : 'x' + transactionId + '_' + customComment,
              expiration:
                expiration instanceof Date
                  ? expiration.getTime()
                  : position
                  ? expiration || position.expiration
                  : expiration,
              offset: position ? offset || position.offset : offset,
              order,
              price: position ? price || position.open_price : price,
              sl: position ? sl || position.sl : sl,
              symbol: position ? symbol || position.symbol : symbol,
              tp: position ? tp || position.tp : tp,
              type,
              volume:
                volume === undefined
                  ? position
                    ? parseFloat(position.volume.toFixed(2))
                    : undefined
                  : parseFloat(volume.toFixed(2)),
            },
          },
          transactionId,
          true
        )
          .then(({ returnData, time }) => {
            if (this.XAPI.isSubscribeTrades) {
              const { data } = this.XAPI.orders[returnData.order] || {}
              if (data === undefined || data === null) {
                this.XAPI.orders[returnData.order] = {
                  order: returnData.order,
                  resolve,
                  reject,
                  data: null,
                  time,
                }
              } else {
                if (data.requestStatus === REQUEST_STATUS_FIELD.ACCEPTED) {
                  resolve(data)
                } else {
                  reject(data)
                }
                delete this.XAPI.orders[returnData.order]
              }
            } else {
              resolve({
                customComment: null,
                message: null,
                order: returnData.order,
                requestStatus: null,
              })
            }
          })
          .catch(reject)
      })
    },
    tradeTransactionStatus: (order: number) =>
      this.sendCommand<tradeTransactionStatusResponse>('tradeTransactionStatus', {
        order,
      }),
  }

  constructor(XAPI: XAPI, password: string) {
    super(XAPI, password, 'wss://' + XAPI.hostName + '/' + XAPI.accountType)
  }
}

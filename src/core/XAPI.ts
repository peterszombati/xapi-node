import { Listener } from '../modules/Listener'
import { Logger4V2 } from 'logger4'
import {
  CMD_FIELD,
  ConnectionStatus,
  PERIOD_FIELD,
  REQUEST_STATUS_FIELD,
  STREAMING_TRADE_RECORD,
  Time,
  TYPE_FIELD,
} from '..'
import { TradePositions, TradeStatus } from '../interface/Interface'
import { CHART_RATE_LIMIT_BY_PERIOD, Currency2Pair, Listeners, PositionType, RelevantCurrencies } from '../enum/Enum'
import { Socket } from './Socket/Socket'
import { Stream } from './Stream/Stream'
import { OpenPosition } from './OpenPosition'
import { PendingOrder } from './PendingOrder'
import { TradeRecord } from './TradeRecord'
import { getObjectChanges } from '../utils/getObjectChanges'

export const DefaultHostname = 'ws.xapi.pro'
export const DefaultRateLimit = 850

type AccountType = string
export interface XAPIConfig {
  accountId: string
  password: string
  type: AccountType
  appName?: string
  host?: string | undefined
  rateLimit?: number | undefined
  logger?: Logger4V2
  safe?: boolean
  subscribeTrades?: boolean
}

export interface XAPIAccount {
  accountId: string
  type: AccountType
  appName?: string | undefined
  host: string
  safe: boolean
  subscribeTrades: boolean
}

export interface Orders {
  [order: number]: {
    order: number
    resolve: any
    reject: any
    data: TradeStatus | null
    time: Time
  }
}

export class XAPI extends Listener {
  public Stream: Stream
  public Socket: Socket
  public orders: Orders = {}
  protected account: XAPIAccount
  private timer: { interval: NodeJS.Timeout[]; timeout: NodeJS.Timeout[] } = {
    interval: [],
    timeout: [],
  }
  private connectionProgress = false

  constructor({
    accountId,
    password,
    type,
    appName = undefined,
    host = undefined,
    rateLimit = undefined,
    logger = new Logger4V2(),
    safe = undefined,
    subscribeTrades = undefined,
  }: XAPIConfig) {
    super()
    this._logger = logger

    this._rateLimit = rateLimit === undefined ? DefaultRateLimit : rateLimit
    this.account = {
      type: type.toLowerCase() === 'real' ? 'real' : 'demo',
      accountId,
      appName,
      host: host === undefined ? DefaultHostname : host,
      safe: safe === true,
      subscribeTrades: subscribeTrades !== false,
    }

    this.Socket = new Socket(this, password)
    this.Stream = new Stream(this)

    if (this.account.safe) {
      logger.info('[TRADING DISABLED] tradeTransaction command is disabled in config (safe = true)')
    }

    this.Stream.onConnectionChange(status => {
      if (status !== ConnectionStatus.CONNECTING) {
        logger.print(
          'debug',
          `${new Date().toISOString()}: Stream ${status === ConnectionStatus.CONNECTED ? 'open' : 'closed'}`
        )

        if (this.Socket.status === ConnectionStatus.CONNECTED) {
          if (this.isReady) {
            this.Stream.ping().catch(e => {
              logger.error(new Error('Stream: ping request failed'))
            })

            if (this.isSubscribeTrades) {
              this.Socket.send
                .getTrades(true)
                .catch()
                .then(() => {
                  if (this.isReady) {
                    this.callListener(Listeners.xapi_onReady)
                  }
                })
            } else {
              this.callListener(Listeners.xapi_onReady)
            }
          }

          this.callListener(Listeners.xapi_onConnectionChange, [status])
        }
      }
    })
    this.Socket.onConnectionChange(status => {
      if (status !== ConnectionStatus.CONNECTING) {
        logger.print(
          'debug',
          `${new Date().toISOString()}: Socket ${status === ConnectionStatus.CONNECTED ? 'open' : 'closed'}`
        )

        if (status === ConnectionStatus.DISCONNECTED) {
          this.Stream.session = ''
          this.stopTimer()
        }

        if (this.Stream.status === ConnectionStatus.CONNECTED) {
          this.callListener(Listeners.xapi_onConnectionChange, [status])
        }
      }
    })

    this.Socket.listen.login((data, time, transaction) => {
      logger.print(
        'debug',
        new Date().toISOString() +
          ': Login is successful (userId = ' +
          this.accountId +
          ', accountType = ' +
          this.accountType +
          ')'
      )
      this.Stream.session = data.streamSessionId
      if (this.isReady) {
        this.Stream.ping().catch(e => {
          logger.error(e)
        })
        this.Socket.send
          .getTrades(true)
          .catch()
          .then(() => {
            if (this.isReady) {
              this.callListener(Listeners.xapi_onReady)
            }
          })
      }
    })

    this.Socket.listen.getTrades((data, time, transaction) => {
      const { sent } = transaction.request

      if (sent !== null && sent.elapsedMs() < 1000) {
        const obj: TradePositions = {}
        data.forEach(t => {
          if (this._positions[t.position] === undefined || this._positions[t.position].value !== null) {
            obj[t.position] = {
              value: new TradeRecord(t),
              lastUpdated: sent,
            }
          }
        })

        Object.values(this._positions).forEach(t => {
          if (obj[t.position] === undefined && t.value !== null) {
            if (t.lastUpdated.elapsedMs() <= 1000) {
              obj[t.position] = t
            }
          }
        })

        this._positions = obj
        this._positionsUpdated = new Time()
      } else {
        logger.print(
          'debug',
          new Date().toISOString() + ': getTrades transaction (' + transaction.transactionId + ') is ignored'
        )
      }
    })

    this.Stream.listen.getTrades((t, time) => {
      if (t.cmd === CMD_FIELD.BALANCE || t.cmd === CMD_FIELD.CREDIT) {
        this.callListener(Listeners.xapi_onBalanceChange, [t])
        return
      }

      if (
        t.type === TYPE_FIELD.PENDING &&
        t.cmd !== CMD_FIELD.BUY_LIMIT &&
        t.cmd !== CMD_FIELD.SELL_LIMIT &&
        t.cmd !== CMD_FIELD.BUY_STOP &&
        t.cmd !== CMD_FIELD.SELL_STOP
      ) {
        this.callListener(Listeners.xapi_onPendingPosition, [new TradeRecord(t)])
      } else if (t.state === 'Deleted') {
        if (this._positions[t.position] !== undefined && this._positions[t.position].value !== null) {
          this._positions[t.position] = { value: null, lastUpdated: time }
          this.callListener(Listeners.xapi_onDeletePosition, [new TradeRecord(t)])
        }
      } else if (this._positions[t.position] === undefined || this._positions[t.position].value !== null) {
        if (this._positions[t.position] !== undefined) {
          const { value } = this._positions[t.position]

          if (value) {
            const changes = getObjectChanges(value, new TradeRecord(t))
            if (Object.keys(changes).length > 0) {
              this.callListener(Listeners.xapi_onChangePosition, [new TradeRecord(t)])
            }
          }
        } else {
          this.callListener(Listeners.xapi_onCreatePosition, [new TradeRecord(t)])
        }

        this._positions[t.position] = { value: new TradeRecord(t), lastUpdated: time }
      }
    })

    this.Socket.listen.getServerTime((data, time, transaction) => {
      if (transaction.response.received !== null && transaction.request.sent !== null) {
        const dif = transaction.response.received.getDifference(transaction.request.sent)

        this._serverTime = {
          timestamp: data.time,
          ping: dif,
          received: transaction.response.received,
        }
      }
    })

    this.Stream.listen.getTradeStatus((s, time) => {
      if (s.requestStatus !== REQUEST_STATUS_FIELD.PENDING) {
        const { resolve, reject } = this.orders[s.order] || {}
        delete s.price
        if (resolve !== undefined && reject !== undefined) {
          if (s.requestStatus === REQUEST_STATUS_FIELD.ACCEPTED) {
            resolve(s)
          } else {
            reject(s)
          }
          delete this.orders[s.order]
        } else {
          this.orders[s.order] = {
            order: s.order,
            reject: undefined,
            resolve: undefined,
            data: s,
            time,
          }
        }
      }
    })

    this.onReady(() => {
      this.stopTimer()
      if (this.isSubscribeTrades) {
        this.Stream.subscribe.getTrades().catch(e => {
          logger.error(new Error('Stream: getTrades request failed'))
        })
        this.Stream.subscribe.getTradeStatus().catch(e => {
          logger.error(new Error('Stream: getTradeStatus request failed'))
        })
      }
      this.Socket.send.getServerTime().catch(e => {
        logger.error(new Error('Socket: getServerTime request failed'))
      })
      this.timer.interval.push(
        setInterval(() => {
          if (this.Socket.status === ConnectionStatus.CONNECTED && !this.Socket.isQueueContains('ping')) {
            this.Socket.ping().catch(e => {
              logger.error(new Error('Socket: ping request failed'))
            })
          }
          if (this.Stream.status === ConnectionStatus.CONNECTED && !this.Stream.isQueueContains('ping')) {
            this.Stream.ping().catch(e => {
              logger.error(new Error('Stream: ping request failed'))
            })
          }
          this.timer.timeout.forEach(i => clearTimeout(i))
          this.timer.timeout = []
          this.timer.timeout.push(
            setTimeout(() => {
              if (this.Socket.status === ConnectionStatus.CONNECTED && !this.Socket.isQueueContains('getServerTime')) {
                this.Socket.send.getServerTime().catch(e => {
                  logger.error(new Error('Socket: getServerTime request failed'))
                })
              }
            }, 1000)
          )
          if (this.isSubscribeTrades) {
            this.timer.timeout.push(
              setTimeout(() => {
                if (this.Socket.status === ConnectionStatus.CONNECTED && !this.Socket.isQueueContains('getTrades')) {
                  this.Socket.send.getTrades(true).catch(e => {
                    logger.error(new Error('Socket: getTrades request failed'))
                  })
                }
              }, 2000)
            )
          }
          this.Socket.rejectOldTransactions()
          this.Stream.rejectOldTransactions()
          if (Object.keys(this.Socket.transactions).length > 20000) {
            this.Socket.removeOldTransactions()
          }
          if (Object.keys(this.Stream.transactions).length > 20000) {
            this.Stream.removeOldTransactions()
          }
        }, 19000)
      )
      if (this.isSubscribeTrades) {
        this.timer.interval.push(
          setInterval(() => {
            this.Stream.subscribe.getTrades().catch(e => {
              logger.error(new Error('Stream: getTrades request failed'))
            })
            this.Stream.subscribe.getTradeStatus().catch(e => {
              logger.error(new Error('Stream: getTradeStatus request failed'))
            })
          }, 60000)
        )
      }
      this.timer.interval.push(
        setInterval(() => {
          if (this.Socket.status === ConnectionStatus.CONNECTED) {
            Object.values(this.orders).forEach(order => {
              if (order.time.elapsedMs() > 5000 && order.resolve !== undefined && order.reject !== undefined) {
                this.refreshOrderStatus(order.order)
              }
            })
          }
        }, 5100)
      )
    }, 'constructor')
  }

  private _logger: Logger4V2

  public get logger(): Logger4V2 {
    return this._logger
  }

  private _rateLimit: number = DefaultRateLimit

  public get rateLimit() {
    return this._rateLimit
  }

  private _tryReconnect = false

  public get tryReconnect() {
    return this._tryReconnect
  }

  private _positions: TradePositions = {}

  public get positions(): TradeRecord[] {
    return Object.values(this._positions)
      .filter(
        t =>
          t.value !== null &&
          (t.value.position_type === PositionType.limit || t.value.position_type === PositionType.open)
      )
      .map(t => t.value)
  }

  private _positionsUpdated: Time | null = null

  public get positionsUpdated(): Time | null {
    return this._positionsUpdated
  }

  private _serverTime: { timestamp: number; ping: number; received: Time } | null = null

  public get serverTime(): number {
    if (this._serverTime === null) {
      return Date.now()
    } else {
      const elapsedMs = this._serverTime.received.elapsedMs()
      return Math.floor(this._serverTime.timestamp + this._serverTime.ping + (elapsedMs === null ? 0 : elapsedMs))
    }
  }

  public get accountType(): string | null {
    return this.account.type
  }

  public get isTradingDisabled(): boolean {
    return this.account.safe
  }

  public get accountId(): string {
    return this.account.accountId
  }

  public get appName(): string | undefined {
    return this.account.appName
  }

  public get hostName(): string {
    return this.account.host
  }

  public get isSubscribeTrades() {
    return this.account.subscribeTrades
  }

  public get openPositions(): OpenPosition[] {
    return this.positions.filter(t => t.position_type === PositionType.open).map(i => new OpenPosition(this, i))
  }

  public get pendingOrders(): PendingOrder[] {
    return this.positions.filter(t => t.position_type === PositionType.limit).map(i => new PendingOrder(this, i))
  }

  public get isConnectionReady(): boolean {
    return this.Stream.status === ConnectionStatus.CONNECTED && this.Socket.status === ConnectionStatus.CONNECTED
  }

  public get isReady(): boolean {
    return (
      this.Stream.status === ConnectionStatus.CONNECTED &&
      this.Socket.status === ConnectionStatus.CONNECTED &&
      this.Stream.session.length > 0
    )
  }

  public connect(params: { timeout?: number | undefined } = {}): Promise<void> {
    if (this.connectionProgress) {
      return Promise.reject(new Error('Another connection process is in progress'))
    }
    this.connectionProgress = true
    return new Promise<void>((resolve, reject) => {
      if (params && typeof params.timeout === 'number') {
        if (params.timeout < 0) {
          reject(new Error(`Invalid parameter: connect({ timeout: ${params.timeout}})`))
          return
        }

        const timeoutId = setTimeout(() => {
          this.disconnect().then(() => {
            reject(new Error('Connection timeout'))
          })
        }, params.timeout)

        const listenerChild = this.onReady(() => {
          clearTimeout(timeoutId)
          listenerChild.stopListen()
          resolve()
        })
      } else {
        const listenerChild = this.onReady(() => {
          listenerChild.stopListen()
          resolve()
        })
      }

      this._tryReconnect = true
      this.Stream.connect()
      this.Socket.connect()
    })
      .catch(e => {
        this.connectionProgress = false
        throw e
      })
      .then(value => {
        this.connectionProgress = false
        return value
      })
  }

  public disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.Stream.session = ''
      this._tryReconnect = false
      this.stopTimer()
      this.Socket.stopTimer()
      this.Stream.stopTimer()
      this.Stream.closeConnection()
      if (this.Socket.status === ConnectionStatus.CONNECTED) {
        this.Socket.logout()
          .catch(() => reject())
          .then(() => {
            this.Socket.closeConnection()
            this.connectionProgress = false
            this.logger.info(this.account.accountId + ' disconnected')
            resolve()
          })
      } else {
        this.Socket.closeConnection()
        this.connectionProgress = false
        this.logger.info(this.account.accountId + ' disconnected')
        resolve()
      }
    })
  }

  public getAccountCurrencyValue(anotherCurrency: RelevantCurrencies): Promise<number> {
    return Currency2Pair[anotherCurrency] === undefined
      ? Promise.reject(anotherCurrency + ' is not relevant currency')
      : Promise.all([
          this.Socket.send.getSymbol(Currency2Pair[anotherCurrency]),
          this.Socket.send.getProfitCalculation(1, CMD_FIELD.BUY, 0, Currency2Pair[anotherCurrency], 1),
        ]).then(values => {
          return values[1].returnData.profit / values[0].returnData.contractSize
        })
  }

  public getPriceHistory({
    symbol,
    period = PERIOD_FIELD.PERIOD_M1,
    ticks = null,
    startUTC = null,
  }: {
    symbol: string
    period?: PERIOD_FIELD | undefined
    ticks?: number | null
    startUTC?: number | null
  }): Promise<{
    symbol: string
    period: PERIOD_FIELD
    candles: {
      timestamp: number
      open: number
      close: number
      low: number
      high: number
      volume: number
    }[]
    digits: number
  }> {
    return (
      startUTC !== null && ticks === null
        ? this.Socket.send.getChartLastRequest(period, startUTC, symbol)
        : this.Socket.send.getChartRangeRequest(
            0,
            period,
            startUTC !== null ? startUTC : this.serverTime,
            symbol,
            ticks === null ? -CHART_RATE_LIMIT_BY_PERIOD[PERIOD_FIELD[period]] : ticks
          )
    ).then(data => ({
      symbol,
      period,
      candles: data.returnData.rateInfos.map(candle => ({
        timestamp: candle.ctm,
        open: Math.round(candle.open),
        close: Math.round(Math.round(candle.close) + Math.round(candle.open)),
        low: Math.round(Math.round(candle.low) + Math.round(candle.open)),
        high: Math.round(Math.round(candle.high) + Math.round(candle.open)),
        volume: candle.vol,
      })),
      digits: data.returnData.digits,
    }))
  }

  public onReady(callBack: () => void, key: string | null = null) {
    if (this.isReady) {
      callBack()
    }
    return this.addListener(Listeners.xapi_onReady, callBack, key)
  }

  public onReject(callBack: (err: any) => void, key: string | null = null) {
    return this.addListener(Listeners.xapi_onReject, callBack, key)
  }

  public onConnectionChange(callBack: (status: ConnectionStatus) => void, key: string | null = null) {
    return this.addListener(Listeners.xapi_onConnectionChange, callBack, key)
  }

  public onCreatePosition(callBack: (position: TradeRecord) => void, key: string | null = null) {
    return this.addListener(Listeners.xapi_onCreatePosition, callBack, key)
  }

  public onDeletePosition(callBack: (position: TradeRecord) => void, key: string | null = null) {
    return this.addListener(Listeners.xapi_onDeletePosition, callBack, key)
  }

  public onChangePosition(callBack: (position: TradeRecord) => void, key: string | null = null) {
    return this.addListener(Listeners.xapi_onChangePosition, callBack, key)
  }

  public onPendingPosition(callBack: (position: TradeRecord) => void, key: string | null = null) {
    return this.addListener(Listeners.xapi_onPendingPosition, callBack, key)
  }

  public onBalanceChange(callBack: (data: STREAMING_TRADE_RECORD) => void, key: string | null = null) {
    return this.addListener(Listeners.xapi_onBalanceChange, callBack, key)
  }

  private refreshOrderStatus(order: number) {
    this.Socket.send
      .tradeTransactionStatus(order)
      .then(({ returnData }) => {
        const { resolve, reject } = this.orders[order] || {}
        if (
          resolve !== undefined &&
          reject !== undefined &&
          returnData.requestStatus !== REQUEST_STATUS_FIELD.PENDING
        ) {
          const obj = {
            requestStatus: returnData.requestStatus,
            order: returnData.order,
            message: returnData.message,
            customComment: returnData.customComment,
          }
          if (returnData.requestStatus === REQUEST_STATUS_FIELD.ACCEPTED) {
            resolve(obj)
          } else {
            reject(obj)
          }
          delete this.orders[order]
        }
      })
      .catch(e => {
        this.logger.error(e)
      })
  }

  private stopTimer() {
    this.timer.interval.forEach(i => clearInterval(i))
    this.timer.timeout.forEach(i => clearTimeout(i))
    this.timer = { interval: [], timeout: [] }
  }
}

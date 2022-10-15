import { REQUEST_STATUS_FIELD, Time } from '..'
import { TransactionStatus, TransactionType } from '../enum/Enum'
import { TradeRecord } from '../core/TradeRecord'

export interface Transactions {
  [transactionId: string]: Transaction<any, any>
}

export interface MessagesQueue {
  transactionId: string
}

export interface TransactionResolveSocket<T> {
  returnData: T
  time: Time
  transaction: Transaction<TransactionResolveSocket<T>, null>
  json: string
}

export interface TransactionResolveStream {
  transaction: Transaction<null, null>
}

export interface Transaction<Resolve, Reject> {
  status: TransactionStatus
  command: string
  createdAt: Time
  transactionId: string
  type: TransactionType
  urgent: boolean
  request: {
    sent: Time | null
    arguments: any
    json: string
  }
  response: {
    status: boolean | null
    received: Time | null
    json: any
  }
  transactionPromise: {
    resolve: null | ((resolve: Resolve | null) => void)
    reject: null | ((reject: Reject | null) => void)
  }
  stack: string | undefined
}

export interface AddTransaction {
  command: string
  json: any
  args: any
  transactionId: string
  resolve: any
  reject: any
  urgent: boolean
  stack: string | undefined
}

export interface TradePositions {
  [position: number]: {
    value: TradeRecord | null
    lastUpdated: Time
  }
}

export interface TradeStatus {
  customComment: string | null
  message: string | null
  order: number
  requestStatus: REQUEST_STATUS_FIELD | null
}

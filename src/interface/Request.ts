import {CMD_FIELD} from '..';
import {TRADE_TRANS_INFO} from './Definitions';

export interface getCommissionDef {
    symbol: string
    volume: number
}

export interface getIbsHistory {
    end: number
    start: number
}

export interface getMarginTrade {
    symbol: string
    volume: number
}

export interface getNews {
    end: number
    start: number
}

export interface getProfitCalculation {
    closePrice: number
    cmd: CMD_FIELD
    openPrice: number
    symbol: string
    volume: number
}

export interface getSymbol {
    symbol: string
}

export interface getTickPrices {
    level: number
    symbols: string[]
    timestamp: number
}

export interface getTradeRecords {
    orders: number[]
}

export interface getTrades {
    openedOnly: boolean
}

export interface getTradesHistory {
    end: number
    start: number
}

export interface getTradingHours {
    symbols: string[]
}

export interface tradeTransaction {
    tradeTransInfo: TRADE_TRANS_INFO
}

export interface tradeTransactionStatus {
    order: number
}
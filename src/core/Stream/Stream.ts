import XAPI from '../XAPI';
import {
    STREAMING_BALANCE_RECORD,
    STREAMING_CANDLE_RECORD,
    STREAMING_KEEP_ALIVE_RECORD,
    STREAMING_NEWS_RECORD,
    STREAMING_PROFIT_RECORD,
    STREAMING_TICK_RECORD,
    STREAMING_TRADE_RECORD,
    STREAMING_TRADE_STATUS_RECORD
} from '../..';
import {StreamConnection} from './StreamConnection';
import {Time} from '../..';

class Stream extends StreamConnection {

    constructor(XAPI: XAPI) {
        super(XAPI);
    }

    public listen = {
        getBalance: (callBack: (data: STREAMING_BALANCE_RECORD, time: Time) => void, key: string | null = null) => {
            this.addListener('command_' + 'balance', callBack, key);
        },
        getCandles: (callBack: (data: STREAMING_CANDLE_RECORD, time: Time) => void, key: string | null = null) => {
            this.addListener('command_' + 'candle', callBack, key);
        },
        getKeepAlive: (callBack: (data: STREAMING_KEEP_ALIVE_RECORD, time: Time) => void, key: string | null = null) => {
            this.addListener('command_' + 'keepAlive', callBack, key);
        },
        getNews: (callBack: (data: STREAMING_NEWS_RECORD, time: Time) => void, key: string | null = null) => {
            this.addListener('command_' + 'news', callBack, key);
        },
        getProfits: (callBack: (data: STREAMING_PROFIT_RECORD, time: Time) => void, key: string | null = null) => {
            this.addListener('command_' + 'profit', callBack, key);
        },
        getTickPrices: (callBack: (data: STREAMING_TICK_RECORD, time: Time) => void, key: string | null = null) => {
            this.addListener('command_' + 'tickPrices', callBack, key);
        },
        getTrades: (callBack: (data: STREAMING_TRADE_RECORD, time: Time) => void, key: string | null = null) => {
            this.addListener('command_' + 'trade', callBack, key);
        },
        getTradeStatus: (callBack: (data: STREAMING_TRADE_STATUS_RECORD, time: Time) => void, key: string | null = null) => {
            this.addListener('command_' + 'tradeStatus', callBack, key);
        },
    };

    public subscribe = {
        getBalance: () => this.sendSubscribe('Balance'),
        getCandles: (symbol: string) => this.sendSubscribe('Candles', {symbol}),
        getKeepAlive: () => this.sendSubscribe('KeepAlive'),
        getNews: () => this.sendSubscribe('News'),
        getProfits: () => this.sendSubscribe('Profits'),
        getTickPrices: (
            symbol: string,
            minArrivalTime: number = 0,
            maxLevel: number = 6
        ) => this.sendSubscribe('TickPrices', {symbol, minArrivalTime, maxLevel}),
        getTrades: () => this.sendSubscribe('Trades'),
        getTradeStatus: () => this.sendSubscribe('TradeStatus'),
    };

    public unSubscribe = {
        getBalance: () => this.sendUnsubscribe('Balance'),
        getCandles: (symbol: string) => this.sendUnsubscribe('Candles', {symbol}),
        getKeepAlive: () => this.sendUnsubscribe('KeepAlive'),
        getNews: () => this.sendUnsubscribe('News'),
        getProfits: () => this.sendUnsubscribe('Profits'),
        getTickPrices: (symbol: string) => this.sendUnsubscribe('TickPrices', {symbol}),
        getTrades: () => this.sendUnsubscribe('Trades'),
        getTradeStatus: () => this.sendUnsubscribe('TradeStatus'),
    };

}

export default Stream;
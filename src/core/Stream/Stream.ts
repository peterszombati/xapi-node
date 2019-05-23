import XAPI from "../XAPI";
import {
	STREAMING_BALANCE_RECORD,
	STREAMING_CANDLE_RECORD,
	STREAMING_KEEP_ALIVE_RECORD,
	STREAMING_NEWS_RECORD,
	STREAMING_PROFIT_RECORD,
	STREAMING_TICK_RECORD,
	STREAMING_TRADE_RECORD,
	STREAMING_TRADE_STATUS_RECORD
} from "../..";
import {StreamConnection} from "./StreamConnection";
import {Time} from "../../modules/Time";

class Stream extends StreamConnection {

	constructor(XAPI: XAPI) {
		super(XAPI);
	}

	public listen = {
		getBalance: (callBack: (data: STREAMING_BALANCE_RECORD, time: Time) => void, key: string = undefined) => {
			this.addListener("balance", callBack, key);
		},
		getCandles: (callBack: (data: STREAMING_CANDLE_RECORD, time: Time) => void, key: string = undefined) => {
			this.addListener("candle", callBack, key);
		},
		getKeepAlive: (callBack: (data: STREAMING_KEEP_ALIVE_RECORD, time: Time) => void, key: string = undefined) => {
			this.addListener("keepAlive", callBack, key);
		},
		getNews: (callBack: (data: STREAMING_NEWS_RECORD, time: Time) => void, key: string = undefined) => {
			this.addListener("news", callBack, key);
		},
		getProfits: (callBack: (data: STREAMING_PROFIT_RECORD, time: Time) => void, key: string = undefined) => {
			this.addListener("profit", callBack, key);
		},
		getTickPrices: (callBack: (data: STREAMING_TICK_RECORD, time: Time) => void, key: string = undefined) => {
			this.addListener("tickPrices", callBack, key);
		},
		getTrades: (callBack: (data: STREAMING_TRADE_RECORD, time: Time) => void, key: string = undefined) => {
			this.addListener("trade", callBack, key);
		},
		getTradeStatus: (callBack: (data: STREAMING_TRADE_STATUS_RECORD, time: Time) => void, key: string = undefined) => {
			this.addListener("tradeStatus", callBack, key);
		},
	};

	public subscribe = {
		getBalance: () => {
			return this.sendSubscribe("Balance");
		},
		getCandles: (symbol: string) => {
			return this.sendSubscribe("Candles", {symbol});
		},
		getKeepAlive: () => {
			return this.sendSubscribe("KeepAlive");
		},
		getNews: () => {
			return this.sendSubscribe("News");
		},
		getProfits: () => {
			return this.sendSubscribe("Profits");
		},
		getTickPrices: (symbol: string, minArrivalTime: number = 0, maxLevel: number = 6) => {
			return this.sendSubscribe("TickPrices", {symbol, minArrivalTime, maxLevel});
		},
		getTrades: () => {
			return this.sendSubscribe("Trades");
		},
		getTradeStatus: () => {
			return this.sendSubscribe("TradeStatus");
		},
	};

	public unSubscribe = {
		getBalance: () => {
			return this.sendUnsubscribe("Balance");
		},
		getCandles: (symbol: string) => {
			return this.sendUnsubscribe("Candles", {symbol});
		},
		getKeepAlive: () => {
			return this.sendUnsubscribe("KeepAlive");
		},
		getNews: () => {
			return this.sendUnsubscribe("News");
		},
		getProfits: () => {
			return this.sendUnsubscribe("Profits");
		},
		getTickPrices: (symbol: string) => {
			return this.sendUnsubscribe("TickPrices", {symbol});
		},
		getTrades: () => {
			return this.sendUnsubscribe("Trades");
		},
		getTradeStatus: () => {
			return this.sendUnsubscribe("TradeStatus");
		},
	};

	public ping(): string {
		return this.sendCommand("ping");
	}

	private sendSubscribe(command: string, completion: any = {}): string {
		return this.sendCommand(`get${command}`, completion);
	}

	private sendUnsubscribe(command: string, completion: any = {}): string {
		return this.sendCommand(`stop${command}`, completion);
	}


}

export default Stream;

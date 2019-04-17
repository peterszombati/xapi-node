import XAPI from '../XAPI';
import {
	CALENDAR_RECORD,
	getChartLastRequest,
	getChartRangeRequest,
	IB_RECORD,
	NEWS_TOPIC_RECORD,
	STEP_RULE_RECORD,
	SYMBOL_RECORD,
	TRADE_RECORD,
	TRADE_TRANS_INFO,
	TRADING_HOURS_RECORD
} from '../../interface/Definitions';
import { Transaction } from '../../interface/XapiTypeGuard';
import {
	getChartLastRequestResponse,
	getChartRangeRequestResponse,
	getCommissionDefResponse,
	getCurrentUserDataResponse,
	getMarginLevelResponse,
	getMarginTradeResponse,
	getProfitCalculationResponse,
	getServerTimeResponse,
	getTickPricesResponse,
	getVersionResponse,
	tradeTransactionResponse,
	tradeTransactionStatusResponse
} from '../../interface/Response';
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
	tradeTransactionStatus
} from '../../interface/Request';
import {CMD_FIELD, PERIOD_FIELD} from '../../enum/Enum';
import {SocketConnection} from "./SocketConnection";
import {Time} from "../../modules/Time";

class Socket extends SocketConnection {

	constructor(XAPI: XAPI) {
		super(XAPI);
	}

	public listen = {
		getAllSymbols: (callBack: (data: SYMBOL_RECORD[], time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getAllSymbols', callBack, key);
		},
		getCalendar: (callBack: (data: CALENDAR_RECORD[], time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getCalendar', callBack, key);
		},
		getChartLastRequest: (callBack: (data: getChartLastRequestResponse, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getChartLastRequest', callBack, key);
		},
		getChartRangeRequest: (callBack: (data: getChartRangeRequestResponse, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getChartRangeRequest', callBack, key);
		},
		getCommissionDef: (callBack: (data: getCommissionDefResponse, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getCommissionDef', callBack, key);
		},
		getCurrentUserData: (callBack: (data: getCurrentUserDataResponse, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getCurrentUserData', callBack, key);
		},
		getIbsHistory: (callBack: (data: IB_RECORD[], time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getIbsHistory', callBack, key);
		},
		getMarginLevel: (callBack: (data: getMarginLevelResponse, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getMarginLevel', callBack, key);
		},
		getMarginTrade: (callBack: (data: getMarginTradeResponse, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getMarginTrade', callBack, key);
		},
		getNews: (callBack: (data: NEWS_TOPIC_RECORD[], time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getNews', callBack, key);
		},
		getProfitCalculation: (callBack: (data: getProfitCalculationResponse, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getProfitCalculation', callBack, key);
		},
		getServerTime: (callBack: (data: getServerTimeResponse, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getServerTime', callBack, key);
		},
		getStepRules: (callBack: (data: STEP_RULE_RECORD[], time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getStepRules', callBack, key);
		},
		getSymbol: (callBack: (data: SYMBOL_RECORD, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getSymbol', callBack, key);
		},
		getTickPrices: (callBack: (data: getTickPricesResponse, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getTickPrices', callBack, key);
		},
		getTradeRecords: (callBack: (data: TRADE_RECORD[], time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getTradeRecords', callBack, key);
		},
		getTrades: (callBack: (data: TRADE_RECORD[], time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getTrades', callBack, key);
		},
		getTradesHistory: (callBack: (data: TRADE_RECORD[], time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getTradesHistory', callBack, key);
		},
		getTradingHours: (callBack: (data: TRADING_HOURS_RECORD[], time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getTradingHours', callBack, key);
		},
		getVersion: (callBack: (data: getVersionResponse, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('getVersion', callBack, key);
		},
		tradeTransaction: (callBack: (data: tradeTransactionResponse, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('tradeTransaction', callBack, key);
		},
		tradeTransactionStatus: (callBack: (data: tradeTransactionStatusResponse, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('tradeTransactionStatus', callBack, key);
		},
		ping: (callBack: (data: any, time: Time, transaction: Transaction<null>) => void, key: string = undefined) => {
			this.addListener('ping', callBack, key);
		}
	};

	public send = {
		getAllSymbols: () => {
			return this.sendCommand<SYMBOL_RECORD[]>('getAllSymbols');
		},
		getCalendar: () => {
			return this.sendCommand<CALENDAR_RECORD[]>('getCalendar');
		},
		getChartLastRequest: (period: PERIOD_FIELD, start: number, symbol: string) => {
			return this.sendCommand<getChartLastRequestResponse>('getChartLastRequest', {
				'info': {
					period,
					start,
					symbol
				}
			});
		},
		getChartRangeRequest: (end: number, period: PERIOD_FIELD, start: number, symbol: string, ticks: number = 0) => {
			return this.sendCommand<getChartRangeRequestResponse>('getChartRangeRequest', {
				'info': {
					end,
					period,
					start,
					symbol,
					ticks
				}
			});
		},
		getCommissionDef: (symbol: string, volume: number) => {
			return this.sendCommand<getCommissionDefResponse>('getCommissionDef', {
				symbol,
				volume
			});
		},
		getCurrentUserData: () => {
			return this.sendCommand<getCurrentUserDataResponse>('getCurrentUserData');
		},
		getIbsHistory: (start: number, end: number) => {
			return this.sendCommand<IB_RECORD[]>('getIbsHistory', {
				end,
				start
			});
		},
		getMarginLevel: () => {
			return this.sendCommand<getMarginLevelResponse>('getMarginLevel');
		},
		getMarginTrade: (symbol: string, volume: number) => {
			return this.sendCommand<getMarginTradeResponse>('getMarginTrade', {
				symbol,
				volume
			});
		},
		getNews: (start: number, end: number) => {
			return this.sendCommand<NEWS_TOPIC_RECORD[]>('getNews', {
				start,
				end
			});
		},
		getProfitCalculation: (closePrice: number, cmd: CMD_FIELD, openPrice: number, symbol: string, volume: number) => {
			return this.sendCommand<getProfitCalculationResponse>('getProfitCalculation', {
				closePrice,
				cmd,
				openPrice,
				symbol,
				volume
			});
		},
		getServerTime: () => {
			return this.sendCommand<getServerTimeResponse>('getServerTime');
		},
		getStepRules: () => {
			return this.sendCommand<STEP_RULE_RECORD[]>('getStepRules');
		},
		getSymbol: (symbol: string) => {
			return this.sendCommand<SYMBOL_RECORD>('getSymbol', {
				symbol
			});
		},
		getTickPrices: (symbols: string[], timestamp: number = 0, level: number = -1) => {
			return this.sendCommand<getTickPricesResponse>('getTickPrices', {
				level,
				symbols,
				timestamp
			});
		},
		getTradeRecords: (orders: number[]) => {
			return this.sendCommand<TRADE_RECORD[]>('getTradeRecords', {
				orders
			});
		},
		getTrades: (openedOnly: boolean = true) => {
			return this.sendCommand<TRADE_RECORD[]>('getTrades', {
				openedOnly
			});
		},
		getTradesHistory: (start: number, end: number) => {
			return this.sendCommand<TRADE_RECORD[]>('getTradesHistory', {
				end,
				start
			});
		},
		getTradingHours: (symbols: string[]) => {
			return this.sendCommand<TRADING_HOURS_RECORD[]>('getTradingHours', {
				symbols
			});
		},
		getVersion: () => {
			return this.sendCommand<getVersionResponse>('getVersion');
		},
		tradeTransaction: (tradeTransInfo: TRADE_TRANS_INFO) => {
			let {customComment, expiration, cmd, offset, order, price, sl, symbol, tp, type, volume} = tradeTransInfo;
			const transactionId = this.XAPI.createTransactionId();
			if (customComment == null) {
				customComment = 'x' + transactionId;
			}
			if (expiration instanceof Date) {
				expiration = expiration.getTime();
			}
			return this.sendCommand<tradeTransactionResponse>('tradeTransaction', {
				'tradeTransInfo': {
					cmd,
					customComment,
					expiration,
					offset,
					order,
					price,
					sl,
					symbol,
					tp,
					type,
					volume: parseFloat(volume.toFixed(2))
				}
			}, transactionId);
		},
		tradeTransactionStatus: (order: number) => {
			return this.sendCommand<tradeTransactionStatusResponse>('tradeTransactionStatus', {
				order
			});
		}
	};

	public ping() {
		return this.sendCommand<null>('ping');
	}

	public logout() {
		return this.sendCommand<null>('logout');
	}

}

export default Socket;
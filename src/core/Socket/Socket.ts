import XAPI from '../XAPI';
import {
	CALENDAR_RECORD,
	IB_RECORD,
	NEWS_TOPIC_RECORD,
	STEP_RULE_RECORD,
	SYMBOL_RECORD,
	TRADE_RECORD,
	TRADE_TRANS_INFO,
	TRADING_HOURS_RECORD
} from '../..';
import { Transaction } from '../../interface/Interface';
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
import {CMD_FIELD, PERIOD_FIELD} from '../..';
import {SocketConnection} from "./SocketConnection";
import {Time} from "../../modules/Time";

interface SocketListen<T> { (data: T, time: Time, transaction: Transaction<null, null>): void }

class Socket extends SocketConnection {

	private _password: string;
	constructor(XAPI: XAPI, password: string) {
		super(XAPI);
		this._password = password;
	}

	public listen = {
		getAllSymbols: (callBack: SocketListen<SYMBOL_RECORD[]>, key: string | null = null) => {
			this.addListener('getAllSymbols', callBack, key);
		},
		getCalendar: (callBack: SocketListen<CALENDAR_RECORD[]>, key: string | null = null) => {
			this.addListener('getCalendar', callBack, key);
		},
		getChartLastRequest: (callBack: SocketListen<getChartLastRequestResponse>, key: string | null = null) => {
			this.addListener('getChartLastRequest', callBack, key);
		},
		getChartRangeRequest: (callBack: SocketListen<getChartRangeRequestResponse>, key: string | null = null) => {
			this.addListener('getChartRangeRequest', callBack, key);
		},
		getCommissionDef: (callBack: SocketListen<getCommissionDefResponse>, key: string | null = null) => {
			this.addListener('getCommissionDef', callBack, key);
		},
		getCurrentUserData: (callBack: SocketListen<getCurrentUserDataResponse>, key: string | null = null) => {
			this.addListener('getCurrentUserData', callBack, key);
		},
		getIbsHistory: (callBack: SocketListen<IB_RECORD[]>, key: string | null = null) => {
			this.addListener('getIbsHistory', callBack, key);
		},
		getMarginLevel: (callBack: SocketListen<getMarginLevelResponse>, key: string | null = null) => {
			this.addListener('getMarginLevel', callBack, key);
		},
		getMarginTrade: (callBack: SocketListen<getMarginTradeResponse>, key: string | null = null) => {
			this.addListener('getMarginTrade', callBack, key);
		},
		getNews: (callBack: SocketListen<NEWS_TOPIC_RECORD[]>, key: string | null = null) => {
			this.addListener('getNews', callBack, key);
		},
		getProfitCalculation: (callBack: SocketListen<getProfitCalculationResponse>, key: string | null = null) => {
			this.addListener('getProfitCalculation', callBack, key);
		},
		getServerTime: (callBack: SocketListen<getServerTimeResponse>, key: string | null = null) => {
			this.addListener('getServerTime', callBack, key);
		},
		getStepRules: (callBack: SocketListen<STEP_RULE_RECORD[]>, key: string | null = null) => {
			this.addListener('getStepRules', callBack, key);
		},
		getSymbol: (callBack: SocketListen<SYMBOL_RECORD>, key: string | null = null) => {
			this.addListener('getSymbol', callBack, key);
		},
		getTickPrices: (callBack: SocketListen<getTickPricesResponse>, key: string | null = null) => {
			this.addListener('getTickPrices', callBack, key);
		},
		getTradeRecords: (callBack: SocketListen<TRADE_RECORD[]>, key: string | null = null) => {
			this.addListener('getTradeRecords', callBack, key);
		},
		getTrades: (callBack: SocketListen<TRADE_RECORD[]>, key: string | null = null) => {
			this.addListener('getTrades', callBack, key);
		},
		getTradesHistory: (callBack: SocketListen<TRADE_RECORD[]>, key: string | null = null) => {
			this.addListener('getTradesHistory', callBack, key);
		},
		getTradingHours: (callBack: SocketListen<TRADING_HOURS_RECORD[]>, key: string | null = null) => {
			this.addListener('getTradingHours', callBack, key);
		},
		getVersion: (callBack: SocketListen<getVersionResponse>, key: string | null = null) => {
			this.addListener('getVersion', callBack, key);
		},
		tradeTransaction: (callBack: SocketListen<tradeTransactionResponse>, key: string | null = null) => {
			this.addListener('tradeTransaction', callBack, key);
		},
		tradeTransactionStatus: (callBack: SocketListen<tradeTransactionStatusResponse>, key: string | null = null) => {
			this.addListener('tradeTransactionStatus', callBack, key);
		},
		ping: (callBack: SocketListen<any>, key: string | null = null) => {
			this.addListener('ping', callBack, key);
		},
		login: (callBack: SocketListen<{streamSessionId: string}>, key: string | null = null) => {
			this.addListener('login', callBack, key);
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
			return this.sendCommand<getServerTimeResponse>('getServerTime', {}, null, true);
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
			} else {
				customComment = 'x' + transactionId + '_' + customComment;
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
			}, transactionId, true);
		},
		tradeTransactionStatus: (order: number) => {
			return this.sendCommand<tradeTransactionStatusResponse>('tradeTransactionStatus', {
				order
			});
		}
	};

	public logout() {
		return this.sendCommand<null>('logout', {}, null, true);
	}

	public login() {
		return this.sendCommand('login', {
			'userId': this.XAPI.getAccountID(),
			'password': this._password,
			'appName': this.XAPI.getAppName()
		}, null, true);
	}

}

export default Socket;

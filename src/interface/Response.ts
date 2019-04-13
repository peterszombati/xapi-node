import {RATE_INFO_RECORD, TICK_RECORD} from "./Definitions";
import {REQUEST_STATUS_FIELD} from "../enum/Enum";

export interface getChartRangeRequestResponse {
	digits: number
	rateInfos: RATE_INFO_RECORD[]
}

export interface getChartLastRequestResponse {
	digits: number
	rateInfos: RATE_INFO_RECORD[]
}

export interface getCommissionDefResponse {
	commission: number
	rateOfExchange: number
}

export interface getCurrentUserDataResponse {
	companyUnit: number
	currency: string
	group: string
	ibAccount: boolean
	leverage: number
	leverageMultiplier: number
	spreadType: string
	trailingStop: boolean
}

export interface getMarginLevelResponse {
	balance: number
	credit: number
	currency: string
	equity: number
	margin: number
	margin_free: number
	margin_level: number
}

export interface getMarginTradeResponse {
	margin: number
}

export interface getProfitCalculationResponse {
	profit: number
}

export interface getServerTimeResponse {
	time: number
	timeString: string
}

export interface getTickPricesResponse {
	quotations: TICK_RECORD[]
}

export interface getVersionResponse {
	version: number
}

export interface tradeTransactionResponse {
	order: number
}

export interface tradeTransactionStatusResponse {
	ask: number
	bid: number
	customComment: string
	message: string
	order: number
	requestStatus: REQUEST_STATUS_FIELD
}

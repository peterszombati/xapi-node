import {Time} from '../modules/Time';
import {CMD_FIELD, TransactionStatus, TransactionType} from '../enum/Enum';

export interface Transactions {
	[transactionId: string]: Transaction<any,any>
}
export interface MessagesQueue {
	transactionId: string
}
export interface TransactionResolveSocket<T> { returnData: T, time: Time, transaction: Transaction<TransactionResolveSocket<T>, null> }
export interface TransactionResolveStream { transaction: Transaction<null, null> }
export interface TransactionReject { reason: { code: string, explain: string }, transaction: Transaction<null,null>}
export interface Transaction<Resolve,Reject> {
	status: TransactionStatus,
	command: string
	createdAt: Time
	transactionId: string
	type: TransactionType
	urgent: boolean
	request: {
		sent: Time | null
		arguments: any
		json: string
	},
	response: {
		status: boolean | null
		received: Time | null
		json: any
	}
	transactionPromise: {
		resolve: null | ((resolve: Resolve | null) => void),
		reject: null | ((reject: Reject | null) => void)
	}
}
export interface AddTransaction {
	command: string,
	json: any,
	args: any,
	transactionId: string,
	resolve: any,
	reject: any,
	urgent: boolean
}

export interface TradePosition {
	close_price: number
	close_time: number
	closed: boolean
	cmd: CMD_FIELD
	comment: string
	commission: number
	customComment: string
	digits: number
	expiration: number
	margin_rate: number
	offset: number
	open_price: number
	open_time: number
	order: number
	order2: number
	position: number
	sl: number
	storage: number
	symbol: string
	tp: number
	volume: number
}

export interface TradePositions {
	[position: number]: TradePosition
}
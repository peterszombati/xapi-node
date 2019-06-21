import {Time} from "../modules/Time";

export interface Transactions {
	[transactionId: string]: Transaction<any,any>
}

export interface MessagesQueue {
	transactionId: string
	urgent: boolean
}

export interface TransactionResolveSocket<T> { returnData: T, time: Time, transaction: Transaction<TransactionResolveSocket<T>, null> }
export interface TransactionResolveStream { transaction: Transaction<null, null> }
export interface TransactionReject { reason: { code: string, explain: string }, transaction: Transaction<null,null>}

export interface Transaction<Resolve,Reject> {
	status: TransactionStatus,
	command: string
	createdAt: Time
	transactionId: string
	isStream: boolean
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
		tResolve: null | ((resolve: Resolve | null) => void),
		tReject: null | ((reject: Reject | null) => void)
	}
}

export enum TransactionStatus {
	waiting = 0,
	sent = 1,
	successful = 2,
	timeout = 3,
	interrupted = 4
}

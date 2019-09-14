import {Time} from "../modules/Time";
import {TransactionStatus} from "../enum/Enum";

export interface Transactions {
	[transactionId: string]: Transaction<any,any>
}

export interface MessagesQueue {
	transactionId: string
}

export interface TransactionResolveSocket<T> { returnData: T, time: Time, transaction: Transaction<TransactionResolveSocket<T>, null> }
export interface TransactionResolveStream { transaction: Transaction<null, null> }
export interface TransactionReject { reason: { code: string, explain: string }, transaction: Transaction<null,null>}
export enum TransactionType {
	SOCKET = 'Socket',
	STREAM = 'Stream'
}

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
		tResolve: null | ((resolve: Resolve | null) => void),
		tReject: null | ((reject: Reject | null) => void)
	}
}



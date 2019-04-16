import {Time} from "../modules/Time";

export interface Transactions {
	[transactionId: string]: Transaction<any>
}


export interface MessagesQueue {
	command: string
	transactionId: string
	json: string
}

export interface Transaction<T> {
	status: TransactionStatus,
	command: string
	createdAt: Time
	transactionId: string
	isStream: boolean
	request: {
		sent: Time,
		arguments: any
		data: string
	},
	response: {
		received: Time
		data: string
	}
	promise: {
		resolve: null | ((resolve: { returnData: T, time: Time, transaction: Transaction<null>}) => void),
		reject: null | ((reject: { reason: any, transaction: Transaction<null>}) => void)
	}
}

export enum TransactionStatus {
	waiting = 0,
	sent = 1,
	successful = 2,
	timeout = 3,
}

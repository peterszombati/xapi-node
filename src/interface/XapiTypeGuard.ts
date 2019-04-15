import {Time} from "../modules/Time";

export interface Transactions {
	[transactionId: string]: Transaction
}


export interface MessagesQueue {
	command: string
	transactionId: string
	json: string
}

export interface Transaction {
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
}

export enum TransactionStatus {
	waiting = 0,
	sent = 1,
	successful = 2,
	timeout = 3,
}

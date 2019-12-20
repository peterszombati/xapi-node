import {TradePosition, Transaction} from '../interface/Interface';
import {STREAMING_TRADE_RECORD, TRADE_RECORD} from "..";

class Utils {

	static hideSecretInfo(transaction: Transaction<any, any>): Transaction<any, any> {
		return {
			...transaction,
			request: {
				...transaction.request,
				json: 'json contains secret information',
				arguments: {},
			}
		}
	}

	static parseCustomTag(customTag: string | null): { transactionId: string | null, command: string | null } {
		if (customTag == null) {
			return { transactionId: null, command: null };
		}
		const customTagData = customTag.split('_');
		if (customTagData.length < 2) {
			return { transactionId: null, command: null };
		}
		const command = customTagData[0];
		const transactionId = customTagData[1];
		return { transactionId, command };
	}

	static formatPosition(t: STREAMING_TRADE_RECORD | TRADE_RECORD): TradePosition {
		return {
			close_price: t.close_price,
			close_time: t.close_time,
			closed: t.closed,
			cmd: t.cmd,
			comment: t.comment,
			commission: t.commission,
			customComment: t.customComment,
			digits: t.digits,
			expiration: t.expiration,
			margin_rate: t.margin_rate,
			offset: t.offset,
			open_price: t.open_price,
			open_time: t.open_time,
			order: t.order,
			order2: t.order2,
			position: t.position,
			sl: t.sl,
			storage: t.storage,
			symbol: t.symbol,
			tp: t.tp,
			volume: t.volume
		};
	};

	static transactionToJSONString(transaction: Transaction<any, any>): string {
		const response = JSON.stringify(transaction.response.json);
		try {
			const createdAtUTC = transaction.createdAt.getUTC();
			const sentUTC = transaction.request.sent == null ? null : transaction.request.sent.getUTC();
			const receivedUTC = transaction.response.received == null ? null : transaction.response.received.getUTC();
			return JSON.stringify({
				...transaction,
				createdAt: transaction.createdAt === null || createdAtUTC === null ? null : createdAtUTC.getTime(),
				request: {
					sent: transaction.request.sent === null || sentUTC == null ? null : sentUTC.getTime(),
					arguments: transaction.command === 'login' ? {} : transaction.request.arguments,
					json: transaction.command === 'login' ? '"json contains secret information"' : transaction.request.json
				},
				response: {
					status: transaction.response.status,
					received: transaction.response.received === null || receivedUTC == null ? null : receivedUTC.getTime(),
					json: response === null || typeof(response) === 'undefined' ? null : (
						(response.length > 1000) ? '"Too long response #xapi-node"' : response
					)
				},
				transactionPromise: undefined
			}, null, '\t');
		} catch (e) {
			return '{}';
		}
	}

	static getUTCTimestampString(): string {
		return new Date().getTime().toString();
	}

	static formatNumber(number: number, length: number): string {
		let result = number.toString();

		if (length - result.length > 0) {
			return '0'.repeat(length - result.length) + result;
		}

		return result;
	}

}

export default Utils;

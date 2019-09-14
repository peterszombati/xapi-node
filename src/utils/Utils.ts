import {Transaction} from "../interface/Interface";

class Utils {

	static Date(UTCtimestamp: number): Date {
		return new Date(UTCtimestamp);
	}

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
			}, null, "\t");
		} catch (e) {
			return "{}";
		}
	}

	static getUTCTimestamp(
		year: number | null = null,
		month: number | null = null,
		date: number | null = null,
		hour: number | null = null,
		minute: number | null = null,
		seconds: number | null = null
	): number {

		if (year == null) {
			return new Date().getTime();
		}

		let returnDate = new Date();

		if (month != null) {
			returnDate.setMonth(month - 1);
		}

		if (date != null) {
			returnDate.setDate(date);
		}

		if (hour != null) {
			returnDate.setHours(hour);
		}

		if (minute != null) {
			returnDate.setMinutes(minute);
		}

		if (seconds != null) {
			returnDate.setSeconds(seconds);
		}

		returnDate.setFullYear(year);

		return returnDate.getTime();
	}

	static formatNumber(number: number, length: number): string {
		let result = number.toString();

		if (length - result.length > 0) {
			return "0".repeat(length - result.length) + result;
		}

		return result;
	}

	static getTimeString(date: Date): string {
		let Y = date.getFullYear().toString();
		let M = (date.getMonth() + 1).toString();
		let D = date.getDate().toString();
		let h = date.getHours().toString();
		let m = date.getMinutes().toString();
		let s = date.getSeconds().toString();
		M = M.length < 2 ? "0" + M : M;
		D = D.length < 2 ? "0" + D : D;
		h = h.length < 2 ? "0" + h : h;
		m = m.length < 2 ? "0" + m : m;
		s = s.length < 2 ? "0" + s : s;
		return Y + "-" + M + "-" + D + " " + h + ":" + m + ":" + s;
	}

	static getDifferenceTimeString(msUnit: number): string {
		let seconds = (msUnit - msUnit % 1000) / 1000;
		let ms = msUnit % 1000;
		let minutes = (seconds - seconds % 60) / 60;
		seconds = seconds % 60;
		let hours = (minutes - minutes % 60) / 60;
		minutes = minutes % 60;
		return hours + ":" + minutes + ":" + seconds + "." + ms;
	}
}

export default Utils;

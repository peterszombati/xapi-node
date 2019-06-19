import {Transaction} from "../interface/XapiTypeGuard";
import Logger from "./Logger";

class Utils {

	static Date(UTCtimestamp: number): Date {
		return new Date(UTCtimestamp);
	}

	static transactionToJSONString(transaction: Transaction<any, any>): string {
		const response = JSON.stringify(transaction.response.json);
		try {
			return JSON.stringify({
				status: transaction.status,
				command: transaction.command,
				createdAt: transaction.createdAt === null ? null : transaction.createdAt.getUTC().getTime(),
				transactionId: transaction.transactionId,
				isStream: transaction.isStream,
				urgent: transaction.urgent,
				request: {
					sent: transaction.request.sent === null ? null : transaction.request.sent.getUTC().getTime(),
					arguments: transaction.command === 'login' ? {} : transaction.request.arguments,
					json: transaction.command === 'login' ? '"json contains secret information"' : transaction.request.json
				},
				response: {
					status: transaction.response.status,
					received: transaction.response.received === null ? null : transaction.response.received.getUTC().getTime(),
					json: response === null ? null : (
						(response.length > 1000) ? '"Too long response #xapi-node"' : response
					)
				}
			}, null, "\t");
		} catch (e) {
			Logger.log.error(JSON.stringify(e));
			return "{}";
		}
	}

	static getUTCTimestamp(year: number = null, month: number = null, date: number = null, hour: number = null, minute: number = null, seconds: number = null): number {

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

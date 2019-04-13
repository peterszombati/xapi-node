class Utils {

	static Date(UTCtimestamp: number): Date {
		return new Date(UTCtimestamp);
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

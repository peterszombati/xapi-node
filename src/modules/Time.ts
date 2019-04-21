function calculateElapsedTime(time: [number, number]): number {
	const hrtime = process.hrtime(time);
	return Math.floor(hrtime[0] * 1000 + hrtime[1] / 1000000);
}

export class Time {
	private unit: [number, number] = null;
	private UTCTimestamp: number = null;

	constructor(setDefaultValue: boolean = true) {
		if (setDefaultValue) {
			this.reset();
		}
		return this;
	}

	public getDifference(time: Time): number | null {
		const a = time.elapsedMs();
		const b = this.elapsedMs();
		if (a === null || b === null) {
			return null;
		}
		return a - b;
 	}

	public reset() {
		this.unit = process.hrtime();
		this.UTCTimestamp = Date.now();
	}

	public get(): Date | null {
		return (this.unit == null) ? null : new Date(Date.now() - calculateElapsedTime(this.unit));
	}

	public elapsedMs(): number | null {
		return (this.unit == null) ? null : calculateElapsedTime(this.unit);
	}

	public isNull(): boolean {
		return (this.unit == null);
	}

	public setNull(): void {
		this.unit = null;
	}

	public getUTC(): Date {
		return new Date(this.UTCTimestamp);
	}
}

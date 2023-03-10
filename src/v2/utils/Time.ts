const isNodeJS = typeof window === 'undefined'

function calculateElapsedTime(time: [number, number]): number {
    if (isNodeJS) {
        const hrtime = process.hrtime(time)
        return Math.floor(hrtime[0] * 1000 + hrtime[1] / 1000000)
    } else {
        return performance.now() - time[0]
    }
}

export class Time {
    protected unit: [number, number]
    protected UTCTimestamp: number

    constructor() {
        this.unit = isNodeJS ? process.hrtime() : [performance.now(), 0]
        this.UTCTimestamp = Date.now()
        return this
    }

    public getDifference(time: Time): number {
        return time.elapsedMs() - this.elapsedMs()
    }

    public get(): Date {
        return new Date(Date.now() - calculateElapsedTime(this.unit))
    }

    public elapsedMs(): number {
        return calculateElapsedTime(this.unit)
    }

    public getUTC(): Date {
        return new Date(this.UTCTimestamp)
    }
}
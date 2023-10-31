import {createPromise} from "./createPromise"

export class Timer {
    private interval: any = null
    private timeout: any = null

    setInterval(callback: () => void, ms: number) {
        this.clear()
        this.interval = setInterval(() => {
            callback()
        }, ms)
    }

    setTimeout<T>(callback: () => void | Promise<T>, ms: number): Promise<T | undefined> {
        this.clear()
        const p = createPromise<T | undefined>()
        const timeoutId = setTimeout(() => {
            try {
                const result = callback()
                if (result instanceof Promise) {
                    result.then((data) => {
                        if (timeoutId === this.timeout) {
                            this.timeout = null
                        }
                        p.resolve(data)
                    })
                    result?.catch(e => {
                        if (timeoutId === this.timeout) {
                            this.timeout = null
                        }
                        p.reject(e)
                    })
                } else if (timeoutId === this.timeout) {
                    this.timeout = null
                    p.resolve(undefined)
                }
            } catch (e) {
                p.reject(e)
            }
        }, ms)
        this.timeout = timeoutId
        return p.promise
    }

    clear() {
        if (this.timeout !== null) {
            clearTimeout(this.timeout)
            this.timeout = null
        }
        if (this.interval !== null) {
            clearInterval(this.interval)
            this.interval = null
        }
    }

    isNull() {
        return this.interval === null && this.timeout === null
    }
}
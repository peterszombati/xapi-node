import {Increment} from "./Increment"

export type ListenerChild = { stopListen: () => void}

export class Listener {
    private increment = new Increment()

    private _listeners: any = {}

    public get listeners() {
        return this._listeners
    }

    public remove(listenerId: string, key: string) {
        if (this._listeners[listenerId] !== undefined
            && this._listeners[listenerId][key] !== undefined) {
            delete this._listeners[listenerId][key]
            if (Object.keys(this._listeners[listenerId]).length === 0) {
                delete this._listeners[listenerId]
            }
        }
    }

    protected addListener(listenerId: string, callBack: any, key: string | null = null): { stopListen: () => void } {
        if (typeof callBack === 'function') {
            if (this._listeners[listenerId] === undefined) {
                this._listeners[listenerId] = {}
            }
            key = key === null
                ? `g${new Date().getTime()}${this.increment.id}`
                : `s${key}`
            this._listeners[listenerId][key] = callBack
            return {
                // @ts-ignore
                stopListen: () => this.remove(listenerId, key)
            }
        }
        throw new Error('addListener "callBack" parameter is not callback')
    }

    protected callListener(listenerId: string, params: any[] = []): void {
        if (this._listeners[listenerId] !== undefined) {
            Object.keys(this._listeners[listenerId]).forEach((key: string) => {
                try {
                    this._listeners[listenerId][key](...params)
                } catch (e) {
                }
            })
        }
    }

    protected fetchListener(listenerId: string, params: any[] = []): ({ key: any, data: any } | { key: any, error: any })[] {
        const values: any[] = []
        if (this._listeners[listenerId] !== undefined) {
            Object.keys(this._listeners[listenerId]).forEach((key: string) => {
                try {
                    values.push({
                        key,
                        data: this._listeners[listenerId][key](...params)
                    })
                } catch (e) {
                    values.push({key, error: e})
                }
            })
        }
        return values
    }
}
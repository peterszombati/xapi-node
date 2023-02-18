import {Increment} from "./Increment"

export class ListenerChild {
    private listener: Listener
    private readonly listenerId: string
    private readonly key: string

    constructor(listener: Listener, listenerId: string, key: string) {
        this.listener = listener
        this.listenerId = listenerId
        this.key = key
    }

    public stopListen() {
        this.listener.remove(this.listenerId, this.key)
    }
}

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

    public addListener(listenerId: string, callBack: any, key: string | null = null): ListenerChild {
        if (typeof callBack === 'function') {
            if (this._listeners[listenerId] === undefined) {
                this._listeners[listenerId] = {}
            }
            key = key === null
                ? `g${new Date().getTime()}${this.increment.id}`
                : `s${key}`
            this._listeners[listenerId][key] = callBack
            return new ListenerChild(this, listenerId, key)
        }
        throw new Error('addListener "callBack" parameter is not callback')
    }

    public callListener(listenerId: string, params: any[] = []): ({ key: any, data: any } | { key: any, error: any })[] {
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
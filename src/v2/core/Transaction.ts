import {createPromise} from "../utils/createPromise"
import {Time} from "../utils/Time"

export class Transaction<Init = Record<string | number, any>, State = Init | Record<string | number, any>> {
    public state: Record<string | number, any>
    private _resolve: (data?: any) => any
    private _reject: (error?: any) => void

    constructor(state?: Init & State) {
        const {resolve, reject, promise} = createPromise()
        this._resolve = resolve
        this._reject = reject
        this._promise = promise
        this.state = {
            createdAt: new Time(),
            ...state,
        }
    }

    private _promise: Promise<any>

    public get promise(): Promise<{ transaction: Transaction<Init, State>, data: any }> {
        return this._promise
    }

    public setState(state: Init | State) {
        this.state = {...this.state, state}
    }

    public resolve(data?: any): Error | undefined | void {
        if (!this.state.resolved && !this.state.rejected) {
            this.state.resolved = new Time()
            return this._resolve({transaction: this, data})
        }
        return new Error('already resolved or rejected')
    }

    public reject(error?: any): Error | undefined | void {
        if (!this.state.resolved && !this.state.rejected) {
            this.state.rejected = new Time()
            if (typeof error === 'object' && error.error instanceof Error) {
                return this._reject({...error,transaction: this})
            } else {
                return this._reject({transaction: this, error})
            }
        }
        return new Error('already resolved or rejected')
    }
}
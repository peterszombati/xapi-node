export class Listener {

    constructor() {
    }

    private _listeners: any = {};

    public get listeners() {
        return this._listeners;
    }

    public addListener(listenerId: string, callBack: any, key: string | null = null) {
        if (typeof (callBack) !== 'function') {
            return;
        }
        if (this._listeners[listenerId] === undefined) {
            this._listeners[listenerId] = {};
        }
        key = key === null
            ? 'g' + Object.keys(this._listeners[listenerId]).length
            : 's' + key;
        this._listeners[listenerId][key] = callBack;
    }

    public callListener(listenerId: string, params: any[] = []) {
        let errors: any[] = [];
        if (this._listeners[listenerId] !== undefined) {
            Object.keys(this._listeners[listenerId]).forEach((key: string) => {
                try {
                    this._listeners[listenerId][key](...params);
                } catch (e) {
                    errors.push(e);
                }
            });
        }
        if (errors.length > 0) {
            throw errors[0];
        }
    }

}
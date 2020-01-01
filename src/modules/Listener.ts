export class Listener {
    constructor() {}

    private _listeners: any = {};

    public get listeners() {
        return this._listeners;
    }

    public addListener(listenerId: string, callBack: any, key: string | null = null): void {
        if (typeof (callBack) === 'function') {
            if (this._listeners[listenerId] === undefined) {
                this._listeners[listenerId] = {};
            }
            key = key === null
                ? 'g' + Object.keys(this._listeners[listenerId]).length
                : 's' + key;
            this._listeners[listenerId][key] = callBack;
        }
    }

    public callListener(listenerId: string, params: any[] = []): any[] {
        let errors: any[] = [];
        let values: any[] = [];
        if (this._listeners[listenerId] !== undefined) {
            Object.keys(this._listeners[listenerId]).forEach((key: string) => {
                try {
                    values.push(this._listeners[listenerId][key](...params));
                } catch (e) {
                    errors.push(e);
                }
            });
        }
        if (errors.length > 0) {
            throw errors[0];
        }
        return values;
    }

}
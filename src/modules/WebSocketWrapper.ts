import {Listener} from './Listener';

export class WebSocketWrapper extends Listener {
    private ws: any = null;
    private _status = false;

    constructor(url: string) {
        super();
        if (typeof window === 'undefined' && typeof module !== 'undefined' && module.exports) {
            // NodeJS module
            const WebSocketClient = require('ws');
            this.ws = new WebSocketClient(url);
            this.ws.on('open', () => {
                this._status = true;
                this.callListener('open');
            });
            this.ws.on('close', () => {
                this._status = false;
                this.callListener('close');
            });
            this.ws.on('message', (message: any) => {
                this.callListener('message', [message]);
            });
            this.ws.on('error', (error: any) => {
                this.callListener('error', [error]);
            });
        } else {
            // JavaScript browser module
            this.ws = new WebSocket(url);
            this.ws.onopen = () => {
                if (this._status === false) {
                    this._status = true;
                    this.callListener('statusChange', [true]);
                }
                this.callListener('open');
            };
            this.ws.onclose = () => {
                if (this._status) {
                    this._status = false;
                    this.callListener('statusChange', [false]);
                }
                this.callListener('close');
            };
            this.ws.onmessage = (event: any) => {
                this.callListener('message', [event.data]);
            };
            this.ws.onerror = (error: any) => {
                this.callListener('error', [error]);
            };
        }
    }

    get status(): boolean {
        return this._status;
    }

    onStatusChange(callback: (status: boolean) => void) {
        this.addListener('statusChange', callback);
    }

    onOpen(callback: () => void) {
        this.addListener('open', callback);
    }

    onMessage(callback: (message: any) => void) {
        this.addListener('message', callback);
    }

    onError(callback: (error: any) => void) {
        this.addListener('error', callback);
    }

    onClose(callback: () => void) {
        this.addListener('close', callback);
    }

    send(data: any) {
        this.ws.send(data);
    }

    close() {
        this.ws.close();
    }

}

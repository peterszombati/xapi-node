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
                this.callListener('ws_open');
            });
            this.ws.on('close', () => {
                this._status = false;
                this.callListener('ws_close');
            });
            this.ws.on('message', (message: any) => {
                this.callListener('ws_message', [message]);
            });
            this.ws.on('error', (error: any) => {
                this.callListener('ws_error', [error]);
            });
        } else {
            // JavaScript browser module
            this.ws = new WebSocket(url);
            this.ws.onopen = () => {
                if (this._status === false) {
                    this._status = true;
                    this.callListener('ws_statusChange', [true]);
                }
                this.callListener('ws_open');
            };
            this.ws.onclose = () => {
                if (this._status) {
                    this._status = false;
                    this.callListener('ws_statusChange', [false]);
                }
                this.callListener('ws_close');
            };
            this.ws.onmessage = (event: any) => {
                this.callListener('ws_message', [event.data]);
            };
            this.ws.onerror = (error: any) => {
                this.callListener('ws_error', [error]);
            };
        }
    }

    get status(): boolean {
        return this._status;
    }

    onStatusChange(callback: (status: boolean) => void) {
        this.addListener('ws_statusChange', callback);
    }

    onOpen(callback: () => void) {
        this.addListener('ws_open', callback);
    }

    onMessage(callback: (message: any) => void) {
        this.addListener('ws_message', callback);
    }

    onError(callback: (error: any) => void) {
        this.addListener('ws_error', callback);
    }

    onClose(callback: () => void) {
        this.addListener('ws_close', callback);
    }

    send(data: any) {
        this.ws.send(data);
    }

    close() {
        this.ws.close();
    }

}
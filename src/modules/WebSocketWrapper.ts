import {Listener} from './Listener';
import {Timer} from "./Timer";

export const isNodeJS = () => typeof window === 'undefined' && typeof module !== 'undefined' && module.exports;

export class WebSocketWrapper extends Listener {
  private ws: any = null;
  private _tryReconnect = false;
  private _connectionTimeout: Timer = new Timer();
  private url: string;

  constructor(url: string, tryReconnectOnFail: boolean = true) {
    super();
    this.url = url;
    this._tryReconnect = tryReconnectOnFail;

    this.onOpen(() => {
      this._connectionTimeout.clear();
    });
    this.onClose(() => {
      if (this._tryReconnect) {
        this._connectionTimeout.setTimeout(() => {
          if (this._tryReconnect) {
            this.connect();
          }
        }, 3000);
      }
    });
  }

  private _status = false;

  get status(): boolean {
    return this._status;
  }

  public connect() {
    this._connectionTimeout.clear();
    if (isNodeJS()) {
      // NodeJS module
      const WebSocketClient = require('ws');
      this.ws = new WebSocketClient(this.url);
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
      this.ws = new WebSocket(this.url);
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

  send(data: any): Promise<void> {
    if (this.status) {
      this.ws.send(data);
      return Promise.resolve();
    } else {
      return Promise.reject(this.url + ' websocket is not connected');
    }
  }

  close() {
    this._connectionTimeout.clear();
    this._tryReconnect = false;
    this.ws && this.ws.close();
  }

}
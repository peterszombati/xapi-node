import {Listener} from './Listener'
import {Timer} from './Timer'
import type {WebSocket as WS} from 'ws'

export const isNodeJS = () => typeof window === 'undefined' && typeof module !== 'undefined' && module.exports

function getWS(): Promise<typeof WS> {
    if (process.env.ES_TARGET == 'esm') {
        return import('ws')
    } else {
        // eslint-disable-next-line
        return new Promise(resolve => resolve(require('ws')))
    }
}

export class WebSocketWrapper extends Listener {
    private ws: any = null
    private _tryReconnect = false
    private _connectionTimeout: Timer = new Timer()
    private url: string

    constructor(url: string, tryReconnectOnFail = true) {
        super()
        this.url = url
        this._tryReconnect = tryReconnectOnFail

        this.onOpen(() => {
            this._connectionTimeout.clear()
        })
        this.onClose(() => {
            if (this._tryReconnect) {
                this._connectionTimeout.setTimeout(() => {
                    if (this._tryReconnect) {
                        this.connect()
                    }
                }, 3000)
            }
        })
    }

    private _status = false
    private _connecting = false

    get status(): boolean {
        return this._status
    }
    get connecting(): boolean {
        return this._connecting
    }

    public connect() {
        this._connectionTimeout.clear()
        if (isNodeJS()) {
            // NodeJS module
            getWS().then(WebSocketClient => {
                this._connecting = true
                this.ws = new WebSocketClient(this.url)
                this.ws.on('open', () => {
                    if (this._status === false) {
                        this._status = true
                        this._connecting = false
                        this.callListener('ws_statusChange', [true])
                    } else {
                        this._connecting = false
                    }
                    this.callListener('ws_open')
                })
                this.ws.on('close', () => {
                    if (this._status) {
                        this._status = false
                        this._connecting = false
                        this.callListener('ws_statusChange', [false])
                    } else {
                        this._connecting = false
                    }
                    this.callListener('ws_close')
                })
                this.ws.on('message', (message: any) => {
                    this.callListener('ws_message', [message])
                })
                this.ws.on('error', (error: any) => {
                    this.callListener('ws_error', [error])
                })
            })
        } else {
            // JavaScript browser module
            this._connecting = true
            this.ws = new WebSocket(this.url)
            this.ws.onopen = () => {
                if (this._status === false) {
                    this._status = true
                    this._connecting = false
                    this.callListener('ws_statusChange', [true])
                } else {
                    this._connecting = false
                }
                this.callListener('ws_open')
            }
            this.ws.onclose = () => {
                if (this._status) {
                    this._status = false
                    this._connecting = false
                    this.callListener('ws_statusChange', [false])
                } else {
                    this._connecting = false
                }
                this.callListener('ws_close')
            }
            this.ws.onmessage = (event: any) => {
                this.callListener('ws_message', [event.data])
            }
            this.ws.onerror = (error: any) => {
                this.callListener('ws_error', [error])
            }
        }
    }

    onStatusChange(callback: (status: boolean) => void) {
        this.addListener('ws_statusChange', callback)
    }

    onOpen(callback: () => void) {
        this.addListener('ws_open', callback)
    }

    onMessage(callback: (message: any) => void) {
        this.addListener('ws_message', callback)
    }

    onError(callback: (error: any) => void) {
        this.addListener('ws_error', callback)
    }

    onClose(callback: () => void) {
        this.addListener('ws_close', callback)
    }

    async send(data: any): Promise<void> {
        if (this.status) {
            this.ws.send(data)
        } else {
            throw new Error(this.url + ' websocket is not connected')
        }
    }

    close() {
        this._connectionTimeout.clear()
        this._tryReconnect = false
        this._connecting = false
        this.ws && this.ws.close()
    }
}
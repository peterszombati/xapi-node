import {WebSocketWrapper} from '../../utils/WebSocketWrapper'
import {Time} from "../../utils/Time"
import {Transaction} from "../Transaction"
import {Timer} from "../../utils/Timer"

export class StreamConnection {
    public lastReceivedMessage: Time | null = null
    public capacity: Time[] = []
    protected WebSocket: WebSocketWrapper
    private session: string
    public socketId: string
    public streamId: string
    private callListener: (listenerId: string, params?: any[]) => any[]
    private connectionProgress: Transaction | null = new Transaction()
    private disconnectionProgress: Transaction | null = new Transaction()

    constructor(url: string, session: string, callListener: (listenerId: string, params?: any[]) => any[], streamId: string, socketId: string) {
        this.session = session
        this.socketId = socketId
        this.streamId = streamId
        this.callListener = callListener
        this.WebSocket = new WebSocketWrapper(url)

        const pingTimer = new Timer()
        this.WebSocket.onOpen(() => {
            this.connectionProgress?.resolve()
            this.disconnectionProgress?.reject(new Error('onOpen'))
            pingTimer.setInterval(() => {
                this.ping().catch(() => {})
            }, 14500)
            this.callListener('onOpen', [streamId, this])
        })
        this.WebSocket.onClose(() => {
            this.disconnectionProgress?.resolve()
            this.connectionProgress?.reject(new Error('onClose'))
            pingTimer.clear()
            this.callListener('onClose', [streamId, this])
        })

        this.WebSocket.onMessage((json: any) => {
            this.lastReceivedMessage = new Time()
            try {
                const message = JSON.parse(json.toString().trim())

                try {
                    this.callListener(`command_${message.command}`, [message.data, new Time(), json, streamId])
                } catch (e) {
                    console.error(e)
                }
            } catch (e) {
                this.callListener(`handleMessage`, [{error: e, time: new Time(), json, streamId}])
            }
        })

        this.WebSocket.onError((error: any) => {
            this.connectionProgress && this.connectionProgress.reject(error)
            this.callListener(`handleMessage`, [{error, time: new Time(), json: null, streamId}])
        })
    }

    public get status(): 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' {
        return this.WebSocket.connecting ? 'CONNECTING' : (this.WebSocket.status ? 'CONNECTED' : 'DISCONNECTED')
    }

    public connect(timeoutMs: number) {
        if (this.WebSocket.status) {
            throw new Error('already connected')
        }
        if (this.connectionProgress) {
            return this.connectionProgress.promise
        }
        const t = new Transaction()
        const timer = new Timer()
        timer.setTimeout(() => {
            this.connectionProgress?.reject(new Error('timeout'))
            this.close()
        }, timeoutMs)
        this.connectionProgress = t
        this.WebSocket.connect()
        return t.promise.catch(e => {
            timer.clear()
            this.connectionProgress = null
            throw e
        }).then((r) => {
            timer.clear()
            this.connectionProgress = null
            this.ping().catch(() => {})
            return r
        })
    }

    public close() {
        if (!this.WebSocket.status || !this.WebSocket.connecting) {
            return Promise.resolve()
        }
        if (this.disconnectionProgress) {
            return this.disconnectionProgress.promise
        }
        const t = new Transaction()
        this.disconnectionProgress = t
        this.WebSocket.close()
        return t.promise.catch(e => {
            this.disconnectionProgress = null
            throw e
        }).then((r) => {
            this.disconnectionProgress = null
            return r
        })
    }

    public ping() {
        return this.send(
            JSON.stringify({
                command: 'ping',
                streamSessionId: this.session,
            })
        )
    }

    public async sendCommand(command: string, completion: Record<string, any> = {}): Promise<Time> {
        return this.send(
            JSON.stringify({
                command,
                streamSessionId: this.session,
                ...completion,
            })
        )
    }

    protected async send(json: string): Promise<Time> {
        if (json.length > 1000) {
            throw new Error('Each command invocation should not contain more than 1kB of data.')
        }
        const time: Time = new Time()
        if (this.capacity.length > 20) {
            this.capacity = [time, ...this.capacity.slice(0, 4)]
        } else {
            this.capacity.unshift(time)
        }
        await this.WebSocket.send(json)
        return time
    }
}
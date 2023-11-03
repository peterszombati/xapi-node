import {WebSocketWrapper} from '../../utils/WebSocketWrapper'
import {Time} from "../../utils/Time"
import {Transaction} from "../Transaction"
import {Timer} from "../../utils/Timer"
import {sleep} from "../../utils/sleep"
import {XAPI} from "../XAPI"

export class StreamConnection {
    public connectedTime: Time | null = null
    public lastReceivedMessage: Time | null = null
    public capacity: Time[] = []
    protected WebSocket: WebSocketWrapper
    private session: string
    public socketId: string
    public streamId: string
    private queue: { transaction: Transaction }[] = []
    private queueTimer: Timer = new Timer()
    private callListener: (listenerId: string, params?: any[]) => void
    private connectionProgress: Transaction | null = null
    private disconnectionProgress: Transaction | null = null
    private XAPI: XAPI

    constructor(url: string, session: string, callListener: (listenerId: string, params?: any[]) => void, streamId: string, socketId: string, XAPI: XAPI) {
        this.session = session
        this.socketId = socketId
        this.streamId = streamId
        this.callListener = callListener
        this.XAPI = XAPI
        this.WebSocket = new WebSocketWrapper(url)

        const pingTimer = new Timer()
        this.WebSocket.onOpen(() => {
            this.connectedTime = new Time()
            this.connectionProgress?.resolve()
            this.disconnectionProgress?.reject(new Error('onOpen'))
            pingTimer.setInterval(() => {
                this.ping().catch(() => {})
            }, 14500)
            this.callListener('onOpen', [streamId, this])
        })
        this.WebSocket.onClose(() => {
            this.connectedTime = null
            this.disconnectionProgress?.resolve()
            this.connectionProgress?.reject(new Error('onClose'))
            pingTimer.clear()
            this.callListener('onClose', [streamId, this])
        })

        this.WebSocket.onMessage((json: any) => {
            this.lastReceivedMessage = new Time()
            try {
                const message = JSON.parse(json.toString().trim())
                this.XAPI.counter.count(['data', 'StreamConnection', 'incomingData'], json.length)

                this.callListener(`command_${message.command}`, [message.data, new Time(), json, streamId])
            } catch (e) {
                this.XAPI.counter.count(['error', 'StreamConnection', 'handleMessage'])
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
        if (!this.WebSocket.status && !this.WebSocket.connecting) {
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
        return this.sendCommand('ping', {})
    }

    public async sendCommand(command: string, completion: Record<string, any> = {}): Promise<{ transaction: Transaction<{json: string},{sent?: Time}>, data: any}> {
        const t = new Transaction<{json: string},{sent?: Time}>({
            json: JSON.stringify({
                command,
                streamSessionId: this.session,
                ...completion,
            }),
        })
        this.XAPI.counter.count(['data', 'StreamConnection', 'sendCommand', command])
        return this.send(t)
    }

    private async cleanQueue() {
        for (; this.queue.length > 0;) {
            if (this.capacity[4].elapsedMs() < 1000) {
                break
            }
            const jsons = this.queue.splice(0, 1)
            if (jsons.length === 1) {
                if (jsons[0].transaction.state.createdAt.elapsedMs() > 9000) {
                    jsons[0].transaction.reject(new Error('queue overloaded'))
                } else {
                    try {
                        this.send(jsons[0].transaction)
                        if (this.queue.length > 0) {
                            await sleep(250)
                        }
                    } catch (e) {
                    }
                }
            } else {
                break
            }
        }
    }

    private callCleaner(elapsedMs: number): Promise<void> {
        return this.queueTimer.setTimeout(async () => {
            await this.cleanQueue()
            if (this.queue.length > 0) {
                return await this.callCleaner(this.capacity[4].elapsedMs())
            }
            return undefined
        }, 1000 - elapsedMs)
    }

    protected async send(transaction: Transaction<{json: string},{sent?: Time}>): Promise<{ transaction: Transaction<{json: string},{sent?: Time}>, data: any}> {
        if (transaction.state.json.length > 1000) {
            transaction.reject(new Error('Each command invocation should not contain more than 1kB of data.'))
            return transaction.promise
        }
        try {
            const elapsedMs = this.capacity.length > 4 ? this.capacity[4].elapsedMs() : 1001
            if (elapsedMs < 1000) {
                this.queue.push({transaction})
                this.queueTimer.isNull() && await this.callCleaner(elapsedMs)
                return transaction.promise
            }
            const time: Time = new Time()
            if (this.capacity.length > 20) {
                this.capacity = [time, ...this.capacity.slice(0, 4)]
            } else {
                this.capacity.unshift(time)
            }
            await this.WebSocket.send(transaction.state.json)
            transaction.setState({
                sent: new Time()
            })
            this.XAPI.counter.count(['data', 'StreamConnection', 'outgoingData'], transaction.state.json.length)
            transaction.resolve(time)
        } catch (e) {
            transaction.reject(e)
        }
        return transaction.promise
    }
}
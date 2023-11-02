import {WebSocketWrapper} from '../../utils/WebSocketWrapper'
import {Time} from '../../utils/Time'
import {parseCustomTag} from '../../utils/parseCustomTag'
import {Transaction} from '../Transaction'
import {Timer} from "../../utils/Timer"
import {createPromise, PromiseObject} from "../../utils/createPromise"
import {sleep} from "../../utils/sleep"
import {XAPI} from "../XAPI"

export class SocketConnection {
    public connectedTime: Time | null = null
    public lastReceivedMessage: Time | null = null
    public capacity: Time[] = []
    public loggedIn: boolean
    public streamId: string
    public socketId: string
    private queue: { transaction: Transaction, promise: PromiseObject<any, any> }[] = []
    private queueTimer: Timer = new Timer()
    protected WebSocket: WebSocketWrapper
    private callListener: (listenerId: string, params?: any[]) => any[]
    private connectionProgress: Transaction | null = null
    private disconnectionProgress: Transaction | null = null
    private XAPI: XAPI

    constructor(url: string, callListener: (listenerId: string, params?: any[]) => any[], socketId: string, XAPI: XAPI) {
        this.socketId = socketId
        this.callListener = callListener
        this.XAPI = XAPI
        this.WebSocket = new WebSocketWrapper(url)

        const pingTimer = new Timer()
        this.WebSocket.onOpen(() => {
            this.connectedTime = new Time()
            this.connectionProgress?.resolve()
            this.disconnectionProgress?.reject(new Error('onOpen'))
            pingTimer.setInterval(() => {
                this.status === 'CONNECTED' && this.loggedIn && this.XAPI.Socket.send.ping(this.socketId)
                  .catch(() => {})
            }, 14500)
            this.callListener('onOpen', [socketId, this])
        })
        this.WebSocket.onClose(() => {
            this.connectedTime = null
            this.disconnectionProgress?.resolve()
            this.connectionProgress?.reject(new Error('onClose'))
            pingTimer.clear()
            this.callListener('onClose', [socketId, this])
        })

        this.WebSocket.onMessage((json: any) => {
            this.lastReceivedMessage = new Time()
            try {
                const message = JSON.parse(json.toString().trim())

                try {
                    this.handleMessage(message, new Time(), json, socketId)
                } catch (e) {
                    console.error(e)
                }
            } catch (e) {
                this.callListener('handleMessage', [{
                    command: null,
                    error: e,
                    time: new Time(),
                    transactionId: null,
                    json,
                    socketId,
                }])
            }
        })

        this.WebSocket.onError((error: any) => {
            this.connectionProgress && this.connectionProgress.reject(error)
            this.callListener('handleMessage', [{
                command: null,
                error,
                time: new Time(),
                transactionId: null,
                json: null,
                socketId,
            }])
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

    private async cleanQueue() {
        for (; this.queue.length > 0;) {
            if (this.capacity[4].elapsedMs() < 1000) {
                break
            }
            const jsons = this.queue.splice(0, 1)
            if (jsons.length === 1) {
                if (jsons[0].transaction.state.createdAt.elapsedMs() > 9000) {
                    jsons[0].promise.reject(new Error('timeout due to queue overloaded'))
                    this.XAPI.counter.count(['data', 'SocketConnection', 'send', 'queue', 'timeout'],
                      1
                    )
                } else {
                    try {
                        this.send(jsons[0].transaction, jsons[0].promise)
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

    public async send(transaction: Transaction, promise?: PromiseObject<Time>): Promise<Time> {
        const _promise = promise ? promise : createPromise<Time>()
        if (transaction.state.json.length > 1000) {
            _promise.reject(new Error('Each command invocation should not contain more than 1kB of data.'))
            return _promise.promise
        }
        try {
            const elapsedMs = this.capacity.length > 4 ? this.capacity[4].elapsedMs() : 1001
            if (elapsedMs < 1000) {
                this.XAPI.counter.count(['data', 'SocketConnection', 'send', 'queue', 'add'],
                  1
                )
                if (transaction.state.priority) {
                    const index = this.queue.findIndex(i => !i.transaction.state.priority)
                    this.queue.splice(index === -1 ? 0 : index,  0, {transaction,promise: _promise})
                } else {
                    this.queue.push({transaction,promise: _promise})
                }
                this.queueTimer.isNull() && await this.callCleaner(elapsedMs)
                return _promise.promise
            }
            const time: Time = new Time()
            if (this.capacity.length > 20) {
                this.capacity = [time, ...this.capacity.slice(0, 4)]
            } else {
                this.capacity.unshift(time)
            }
            await this.WebSocket.send(transaction.state.json)
            this.XAPI.counter.count(['data', 'SocketConnection', 'send', 'waitingTime'],
              transaction.state.createdAt.elapsedMs()
            )
            this.XAPI.logger.debug({ source: 'src/v2/core/Socket/SocketConnection.ts', function: 'send', data: {
                command: transaction.state.command,
                args: transaction.state.command === 'login' ? {
                    ...transaction.state.args,
                    password: typeof transaction.state?.args?.password == 'string' ? '*' : undefined,
                } : transaction.state.args,
                } })
            transaction.setState({
                sent: new Time()
            })
            this.XAPI.counter.count(['data', 'SocketConnection', 'outgoingData'], transaction.state.json.length)
            _promise.resolve(time)
        } catch (e) {
            _promise.reject(e)
        }
        return _promise.promise
    }

    private handleMessage(message: any, time: Time, json: any, socketId: string) {
        if (message.status) {
            const returnData =
                message.streamSessionId === undefined
                    ? message.returnData
                    : {streamSessionId: message.streamSessionId}
            const {transactionId, command} = typeof message.customTag === 'string'
                ? parseCustomTag(message.customTag)
                : parseCustomTag(null)

            if (transactionId !== null && command !== null) {
                this.callListener('handleMessage', [{command, returnData, time, transactionId, json, socketId}])
            } else {
                this.callListener('handleMessage', [{
                    command,
                    error: {errorDescr: 'Received a message without valid customTag', errorCode: -1},
                    time,
                    transactionId,
                    json,
                    socketId,
                }])
            }
        } else if (message.status !== undefined && message.errorCode !== undefined) {
            const {transactionId, command} = message.customTag === undefined
                ? parseCustomTag(null)
                : parseCustomTag(message.customTag)
            this.callListener('handleMessage', [{
                command,
                error: {errorDescr: message.errorDescr || null, errorCode: message.errorCode},
                time,
                transactionId,
                json,
                socketId
            }])
        } else {
            this.callListener('handleMessage', [{
                command: null,
                error: {errorDescr: 'invalid json schema'},
                time,
                transactionId: null,
                json,
                socketId
            }])
        }
    }
}
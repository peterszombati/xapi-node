import {Listener} from '../../utils/Listener'
import {SocketConnection} from './SocketConnection'
import {Transaction} from '../Transaction'
import {Time} from '../../utils/Time'
import {Increment} from "../../utils/Increment"
import {XAPI} from "../XAPI"

export class SocketConnections extends Listener {
    public connections: Record<string, SocketConnection> = {}
    public transactions: Record<string, Transaction> = {}
    private url: string
    protected XAPI: XAPI

    constructor(url: string, XAPI: XAPI) {
        super()
        this.url = url
        this.XAPI = XAPI
        this.addListener('handleMessage', (params: {
            command: string, error?: any, returnData?: any, time: Time, transactionId: string, json: string, socketId: string
        }) => {
            if (this.transactions[params.transactionId]) {
                if (params.error) {
                    this.XAPI.counter.count(['error', 'SocketConnections', 'handleMessage'], 1)
                    this.transactions[params.transactionId].reject({
                        error: params.error,
                        jsonReceived: params.time,
                        json: params.json,
                    })
                } else {
                    this.XAPI.counter.count(['data', 'SocketConnections', 'incomingData'], params.json.length)
                    this.transactions[params.transactionId].resolve({
                        returnData: params.returnData,
                        jsonReceived: params.time,
                        json: params.json,
                    })
                    this.callListener(`command_${params.command}`, [params.returnData, params.time, this.transactions[params.transactionId], params.json, params.socketId])
                }
                delete this.transactions[params.transactionId]
            }
        })
        this.addListener('onClose', (socketId: string) => {
            for (const t of Object.values(this.transactions)) {
                if (t.state.socketId === socketId) {
                    t.reject({
                        error: new Error('socket closed'),
                        jsonReceived: null,
                        json: null,
                    })
                    if (t.state.transactionId) {
                        delete this.transactions[t.state.transactionId]
                    }
                }
            }
            delete this.connections[socketId]
        })
    }

    public onClose(callback: (socketId: string, connection: SocketConnection) => void) {
        return this.addListener('onClose', (socketId: string, connection: SocketConnection) => {
            callback(socketId, connection)
        })
    }

    public onOpen(callback: (socketId: string, connection: SocketConnection) => void) {
        return this.addListener('onOpen', (socketId: string, connection: SocketConnection) => {
            callback(socketId, connection)
        })
    }

    socketIdIncrement = new Increment()
    public connect(timeoutMs: number): Promise<string> {
        const socketId = `${new Date().getTime()}${this.socketIdIncrement.id}`
        this.connections[socketId] = new SocketConnection(
          this.url,
          (listenerId: string, params?: any[]) => this.fetchListener(listenerId, params),
          socketId,
          this.XAPI
        )
        return this.connections[socketId].connect(timeoutMs)
            .then(() => socketId)
    }

    transactionIncrement = new Increment()
    protected createTransactionId() {
        return `${new Date().getTime()}${this.transactionIncrement.id}`
    }

    private getSocketId(): string | undefined {
        return Object.values(this.connections).map((connection) => {
            const times = connection.capacity.filter(i => i.elapsedMs() < 1500)
            return {
                point: times.length <= 4 ? times.length : (5 + (1500 - times[4].elapsedMs())),
                connection,
            }
        }).sort((a,b) => a.point - b.point)[0]?.connection?.socketId
    }

    protected sendCommand<T>(
        command: string,
        args: any = {},
        transactionId: string | null = null,
        priority = false,
        socketId?: string,
        // @ts-ignore
    ): Promise<{
        transaction: Transaction
        data: {
            returnData: T
            jsonReceived: Time
            json: string
        }
    }> {
        if (!transactionId) {
            transactionId = this.createTransactionId()
        }

        if (!socketId) {
            socketId = this.getSocketId()
        }

        this.transactions[transactionId] = new Transaction({
            transactionId,
            json: JSON.stringify({
                command,
                arguments: Object.keys(args).length === 0 ? undefined : args,
                customTag: `${command}_${transactionId}`,
            }),
            socketId,
            priority,
        })

        if (socketId) {
            if (this.connections[socketId]) {
                this.XAPI.counter.count(['data', 'SocketConnections', 'sendCommand', command])
                this.connections[socketId].send(this.transactions[transactionId])
                    .catch(error => {
                        this.XAPI.counter.count(['error', 'SocketConnections', 'sendCommand', command], 1)
                        // @ts-ignore: invalid warning look at #103_line
                        if (this.transactions[transactionId]) {
                            // @ts-ignore: invalid warning look at #103_line
                            this.transactions[transactionId].reject(error)
                            // @ts-ignore: invalid warning look at #103_line
                            delete this.transactions[transactionId]
                        }
                    })
            } else {
                this.transactions[transactionId].reject(new Error('invalid socketId'))
                delete this.transactions[transactionId]
            }
        } else {
            this.transactions[transactionId].reject(new Error('there is no connected socket'))
            delete this.transactions[transactionId]
        }

        return this.transactions[transactionId].promise
    }
}
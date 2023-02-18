import {Listener} from '../../utils/Listener'
import {SocketConnection} from './SocketConnection'
import {Transaction} from '../Transaction'
import {Time} from '../../utils/Time'
import {Increment} from "../../utils/Increment"

export class SocketConnections extends Listener {
    public connections: Record<string, SocketConnection> = {}
    public transactions: Record<string, Transaction> = {}
    private url: string

    constructor(url: string) {
        super()
        this.url = url
        this.addListener('handleMessage', (params: {command: string, error?: any, returnData?: any, time: Time, transactionId: string, json: string, socketId: string}) => {
            if (this.transactions[params.transactionId]) {
                if (params.error) {
                    this.transactions[params.transactionId].reject({
                        error: params.error,
                        jsonReceived: params.time,
                        json: params.json,
                    })
                } else {
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
        this.connections[socketId] = new SocketConnection(this.url, this.callListener, socketId)
        return this.connections[socketId].connect(timeoutMs)
            .then(() => socketId)
    }

    transactionIncrement = new Increment()
    protected createTransactionId() {
        return `${new Date().getTime()}${this.transactionIncrement.id}`
    }

    private getSocketId(): string | undefined {
        return Object.entries(this.connections).map(([_,c]) => {
            const times = c.capacity.filter(i => i.elapsedMs() < 1500)
            const point = times.length <= 4 ? times.length : (5 + (1500 - times[4].elapsedMs()))
            return {
                point,
                connection: c,
            }
        }).sort((a,b) => a.point - b.point)[0]?.connection?.socketId
    }

    protected sendCommand<T>(
        command: string,
        args: any = {},
        transactionId: string | null = null,
        priority = false, //TODO: currently this property is ignored
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
        })

        if (socketId) {
            if (this.connections[socketId]) {
                this.connections[socketId].send(this.transactions[transactionId].state.json)
                    .catch(error => {
                        // @ts-ignore: invalid warning look at #104_line
                        if (this.transactions[transactionId]) {
                            // @ts-ignore: invalid warning look at #104_line
                            this.transactions[transactionId].reject(error)
                            // @ts-ignore: invalid warning look at #104_line
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
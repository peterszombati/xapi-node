import {Listener} from '../../utils/Listener'
import {StreamConnection} from "./StreamConnection"
import {Increment} from "../../utils/Increment"

export class StreamConnections extends Listener {
    public connections: Record<string, StreamConnection> = {}
    public subscribes: Record<string /* command */, Record<string/* parameter */, string /* streamId */>> = {}
    private url: string

    constructor(url: string) {
        super()
        this.url = url
        this.addListener('onClose', (streamId: string) => {
            for (const command of Object.keys(this.subscribes)) {
                for (const [parameter,_streamId] of Object.entries(this.subscribes[command])) {
                    if (_streamId === streamId) {
                        delete this.subscribes[command][parameter]
                    }
                }
            }
            delete this.connections[streamId]
        })
    }

    public onClose(callback: (streamId: string, connection: StreamConnection) => void) {
        return this.addListener('onClose', (streamId: string, connection: StreamConnection) => {
            callback(streamId, connection)
        })
    }

    public onOpen(callback: (streamId: string, connection: StreamConnection) => void) {
        return this.addListener('onOpen', (streamId: string, connection: StreamConnection) => {
            callback(streamId, connection)
        })
    }

    streamIdIncrement = new Increment()
    public async connect(timeoutMs: number, session: string, socketId: string): Promise<string> {
        const streamId = `${new Date().getTime()}${this.streamIdIncrement.id}`
        this.connections[streamId] = new StreamConnection(this.url, session, (listenerId: string, params?: any[]) => this.callListener(listenerId, params), streamId, socketId)
        await this.connections[streamId].connect(timeoutMs)
        return streamId
    }

    private getStreamId(command: string, completion: Record<string, string | number> = {}): string | undefined {
        if (this.subscribes[command]) {
            if (this.subscribes[command][JSON.stringify(completion)]) {
                if (this.connections[this.subscribes[command][JSON.stringify(completion)]]) {
                    return this.subscribes[command][JSON.stringify(completion)]
                } else {
                    delete this.subscribes[command][JSON.stringify(completion)]
                }
            } else if (this.subscribes[command]['{}']) {
                if (this.connections[this.subscribes[command]['{}']]) {
                    return this.subscribes[command]['{}']
                } else {
                    delete this.subscribes[command]['{}']
                }
            } else if (Object.keys(this.subscribes[command])[0]) {
                return this.subscribes[command][Object.keys(this.subscribes[command])[0]]
            }
        }
        return Object.entries(this.connections).map(([_,c]) => {
            const times = c.capacity.filter(i => i.elapsedMs() < 1500)
            const point = times.length <= 4 ? times.length : (5 + (1500 - times[0].elapsedMs()))
            return {
                point,
                connection: c,
            }
        }).sort((a,b) => a.point - b.point)[0]?.connection?.streamId
    }

    protected sendSubscribe(command: string, completion: Record<string, string | number> = {}) {
        const streamId = this.getStreamId(command)
        if (!streamId) {
            throw new Error('there is no connected stream')
        }
        const promise = this.connections[streamId].sendCommand('get' + command, completion)
        if (this.subscribes[command]) {
            this.subscribes[command][JSON.stringify(completion)] = streamId
        } else {
            this.subscribes[command] = {
                [JSON.stringify(completion)]: streamId
            }
        }
        return promise
    }

    protected sendUnsubscribe(command: string, completion: Record<string, string | number> = {}) {
        if (!this.subscribes[command]) {
            return Promise.resolve(undefined)
        }
        const streamId = this.subscribes[command][JSON.stringify(completion)]
        if (!streamId) {
            return Promise.resolve(undefined)
        }
        if (!this.connections[streamId]) {
            return Promise.resolve(undefined)
        }
        return this.connections[streamId].sendCommand('stop' + command, completion)
    }
}
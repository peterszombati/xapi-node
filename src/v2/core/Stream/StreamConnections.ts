import {Listener} from '../../utils/Listener'
import {StreamConnection} from "./StreamConnection"
import {Increment} from "../../utils/Increment"
import {Time} from "../../utils/Time"

export class StreamConnections extends Listener {
    public connections: Record<string, StreamConnection> = {}
    public subscribes: Record<
        string /* command */,
        Record<string /* parameter */,
            Record<string /* streamId */, Time /* createdAt */>
        >
    > = {}
    private url: string

    constructor(url: string) {
        super()
        this.url = url
        this.addListener('onClose', (streamId: string) => {
            for (const command of Object.keys(this.subscribes)) {
                for (const [parameter, _streamIdObject] of Object.entries(this.subscribes[command])) {
                    for (const [_streamId, createdAt] of Object.entries(_streamIdObject)) {
                        if (_streamId === streamId) {
                            delete this.subscribes[command][parameter][_streamId]
                        }
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
        this.connections[streamId] = new StreamConnection(this.url, session, (listenerId: string, params?: any[]) => this.fetchListener(listenerId, params), streamId, socketId)
        await this.connections[streamId].connect(timeoutMs)
        return streamId
    }

    private getStreamId(command: string, completion: Record<string, string | number> = {}): string | undefined {
        if (this.subscribes[command]) {
            if (this.subscribes[command][JSON.stringify(completion)]) {
                const streamIds = Object.entries(this.subscribes[command][JSON.stringify(completion)])
                for (const [streamId] of streamIds) {
                    if (this.connections[streamId]?.status === 'CONNECTED') {
                        return streamId
                    } else {
                        delete this.subscribes[command][JSON.stringify(completion)][streamId]
                    }
                }
            } else if (this.subscribes[command]['{}']) {
                const streamIds = Object.entries(this.subscribes[command]['{}'])
                for (const [streamId] of streamIds) {
                    if (this.connections[streamId]?.status === 'CONNECTED') {
                        return streamId
                    } else {
                        delete this.subscribes[command]['{}'][streamId]
                    }
                }
            } else if (Object.keys(this.subscribes[command])[0]) {
                const firstKey = Object.keys(this.subscribes[command])[0]
                const streamIds = Object.entries(this.subscribes[command][firstKey])
                for (const [streamId] of streamIds) {
                    if (this.connections[streamId]?.status === 'CONNECTED') {
                        return streamId
                    } else {
                        delete this.subscribes[command][firstKey][streamId]
                    }
                }
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

    protected sendSubscribe(command: string, completion: Record<string, string | number> = {}, streamId: string | undefined = undefined) {
        if (!streamId) {
            streamId = this.getStreamId(command)
            if (!streamId) {
                throw new Error('there is no connected stream '+JSON.stringify({streamId}))
            }
        }
        if (!this.connections[streamId]) {
            throw new Error('there is no connected stream '+JSON.stringify({streamId}))
        }
        const promise = this.connections[streamId].sendCommand('get' + command, completion)
        if (this.subscribes[command]) {
            const completionKey = JSON.stringify(completion)
            if (!this.subscribes[command][completionKey]) {
                this.subscribes[command][completionKey] = {}
            }
            this.subscribes[command][completionKey][streamId] = new Time()
        } else {
            this.subscribes[command] = {
                [JSON.stringify(completion)]: { streamId: new Time() }
            }
        }
        return promise
    }

    protected sendUnsubscribe(command: string, completion: Record<string, string | number> = {}) {
        if (!this.subscribes[command]) {
            return Promise.resolve(undefined)
        }
        const streamIds = Object.entries(this.subscribes[command][JSON.stringify(completion)])
        if (streamIds.length === 0) {
            return Promise.resolve(undefined)
        }
        return Promise.allSettled(streamIds
            .filter(([streamId]) => this.connections[streamId])
            .map(([streamId]) => this.connections[streamId].sendCommand('stop' + command, completion)))
    }
}
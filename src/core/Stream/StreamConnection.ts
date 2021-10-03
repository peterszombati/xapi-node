import {TransactionResolveStream} from '../../interface/Interface';
import {Time, Timer} from '../..';
import {WebSocketWrapper} from '../../modules/WebSocketWrapper';
import {ConnectionStatus, errorCode, Listeners, TransactionStatus, TransactionType} from '../../enum/Enum';
import {Queue} from '../Queue';
import {XAPI} from '../XAPI';

export class StreamConnection extends Queue {

    public session: string = '';
    private pingTimeout: Timer = new Timer();

    constructor(XAPI: XAPI, url: string) {
        super(XAPI, TransactionType.STREAM);
        this.WebSocket = new WebSocketWrapper(url);
        this.WebSocket.onOpen(() => this.setConnectionStatus(ConnectionStatus.CONNECTING));
        this.WebSocket.onClose(() => this.setConnectionStatus(ConnectionStatus.DISCONNECTED));

        this.WebSocket.onMessage((json: any) => {
            this.lastReceivedMessage = new Time();
            try {
                const message = JSON.parse(json.toString().trim());

                try {
                    this.callListener('command_' + message.command, [message.data, new Time(), json]);
                } catch (e) {
                    this.XAPI.logger.error(e, 'Stream WebSocket Handle Message ERROR');
                }
            } catch (e) {
                this.XAPI.logger.error(e, 'Stream WebSocket JSON parse ERROR');
            }
        });

        this.WebSocket.onError((error: any) => {
            this.XAPI.logger.error(error, 'Stream WebSocket ERROR');
        });
    }

    public connect() {
        this.WebSocket.connect();
    }

    public onConnectionChange(callBack: (status: ConnectionStatus) => void, key: string | null = null) {
        this.addListener(Listeners.xapi_onConnectionChange, callBack, key);
    }

    private setConnectionStatus(status: ConnectionStatus) {
        this.resetMessageTube();
        this.openTimeout.clear();
        this.pingTimeout.clear();
        this.status = status;

        if (status === ConnectionStatus.CONNECTING) {
            if (this.session.length > 0) {
                this.pingTimeout.setTimeout(() => {
                    this.ping().catch(e => {
                        this.XAPI.logger.error(e, 'Stream: ping request failed (StreamConnection.ts:66)');
                    });
                }, 100);
            }

            this.openTimeout.setTimeout(() => {
                this.status = ConnectionStatus.CONNECTED;
            }, 1000);
        } else {
            for (const transactionId in this.transactions) {
                if (this.transactions[transactionId].status === TransactionStatus.waiting) {
                    this.rejectTransaction({
                        code: errorCode.XAPINODE_1,
                        explain: 'Stream closed'
                    }, this.transactions[transactionId], false);
                }
            }
        }
    }

    protected sendCommand(command: string, completion: any = {}, urgent: boolean = false):
        Promise<TransactionResolveStream> {
        const stack = new Error('').stack
        return new Promise((resolve: any, reject: any) => {
            const transaction = this.addTransaction({
                command,
                json: JSON.stringify({
                    command,
                    'streamSessionId': this.session,
                    ...completion,
                }),
                args: completion,
                transactionId: this.createTransactionId(),
                resolve,
                reject,
                urgent,
                stack,
            });

            if (transaction.request.json.length > 1000) {
                this.rejectTransaction({
                    code: errorCode.XAPINODE_0,
                    explain: 'Each command invocation should not contain more than 1kB of data.'
                }, transaction);
            } else if (this.status === ConnectionStatus.DISCONNECTED) {
                this.rejectTransaction({
                    code: errorCode.XAPINODE_1,
                    explain: 'Stream closed'
                }, transaction);
            } else if (this.session.length === 0) {
                this.rejectTransaction({
                    code: errorCode.XAPINODE_BE103,
                    explain: 'User is not logged'
                }, transaction);
            } else {
                this.sendMessage(transaction, true);
            }
        });
    }

    public closeConnection() {
        this.WebSocket.close();
    }

    public ping() {
        return this.sendCommand('ping', {}, true);
    }

    protected sendSubscribe(command: string, completion: any = {}) {
        return this.sendCommand(`get${command}`, completion);
    }

    protected sendUnsubscribe(command: string, completion: any = {}) {
        return this.sendCommand(`stop${command}`, completion);
    }

}
import {AddTransaction, MessagesQueue, Transaction, Transactions} from '../interface/Interface';
import {Listener} from '../modules/Listener';
import {Time} from '..';
import {Log} from '../utils/Log';
import {ConnectionStatus, errorCode, TransactionStatus, TransactionType} from '../enum/Enum';
import Utils from '../utils/Utils';
import {WebSocketWrapper} from '../modules/WebSocketWrapper';
import {Timer} from '..';

export class Queue extends Listener {
    public status: ConnectionStatus = ConnectionStatus.DISCONNECTED;
    public transactions: Transactions = {};
    public lastReceivedMessage: Time | null = null;
    private type: TransactionType;
    private messageQueues: { urgent: MessagesQueue[], normal: MessagesQueue[] } = {urgent: [], normal: []};
    private _transactionIdIncrement: number = 0;
    private messagesElapsedTime: Time[] = [];
    private messageSender: Timer = new Timer();
    private rateLimit: number;
    protected openTimeout: Timer = new Timer();
    protected reconnectTimeout: Timer = new Timer();
    protected WebSocket: WebSocketWrapper;

    private get queueSize() {
        return this.messageQueues.urgent.length + this.messageQueues.normal.length;
    }

    constructor(rateLimit: number, type: TransactionType) {
        super();
        this.rateLimit = rateLimit;
        this.type = type;
    }

    public stopTimer() {
        this.openTimeout.clear();
        this.reconnectTimeout.clear();
    }

    private addQueu(transaction: Transaction<any, any>): void {
        const {urgent, transactionId} = transaction;
        if (this.queueSize >= 150) {
            this.rejectTransaction({
                code: errorCode.XAPINODE_2,
                explain: 'messageQueues exceeded 150 size limit'
            }, transaction);
        } else {
            if (urgent) {
                this.messageQueues.urgent.push({transactionId});
            } else {
                this.messageQueues.normal.push({transactionId});
            }
            Log.hidden((this.type === TransactionType.STREAM ? ' Stream' : 'Socket')
                + ' (' + transaction.transactionId + '): added to queue (messages in queue = ' + this.queueSize + ')', 'INFO');
        }
    }

    private addElapsedTime(time: Time) {
        if (this.messagesElapsedTime.length > 4) {
            this.messagesElapsedTime = [...this.messagesElapsedTime.slice(1,5), time];
        } else {
            this.messagesElapsedTime.push(time);
        }
    }

    private isRateLimitReached() {
        return this.messagesElapsedTime.length < 4
            ? false
            : this.messagesElapsedTime[this.messagesElapsedTime.length - 4].elapsedMs() < this.rateLimit;
    }

    protected resetMessageTube() {
        if (this.queueSize > 0) {
            Log.info((this.type === TransactionType.STREAM ? ' Stream' : 'Socket')
                + ' Message queue reseted, deleted = ' + this.queueSize);
        }
        this.messageQueues = {urgent: [], normal: []};
        this.messagesElapsedTime = [];
        this.messageSender.clear();
    }

    public createTransactionId(): string {
        this._transactionIdIncrement += 1;
        if (this._transactionIdIncrement > 9999) {
            this._transactionIdIncrement = 0;
        }
        return Utils.getUTCTimestampString() + Utils.formatNumber(this._transactionIdIncrement, 4) + (this.type === TransactionType.SOCKET ? '0' : '1');
    }

    protected addTransaction(newTransaction: AddTransaction): Transaction<null, null> {
        return this.transactions[newTransaction.transactionId] = {
            command: newTransaction.command,
            type: this.type,
            request: {json: newTransaction.json, arguments: newTransaction.args, sent: null},
            response: {json: null, received: null, status: null},
            transactionId: newTransaction.transactionId,
            createdAt: new Time(),
            status: TransactionStatus.waiting,
            transactionPromise: {resolve: newTransaction.resolve, reject: newTransaction.reject},
            urgent: newTransaction.urgent
        };
    }

    public rejectOldTransactions(): void {
        Object.values(this.transactions)
            .filter(t => t.transactionPromise.reject !== null && t.createdAt.elapsedMs() > 60000)
            .forEach(transaction => {
                this.rejectTransaction({
                    code: errorCode.XAPINODE_3,
                    explain: 'Timeout'
                }, transaction);
            });
    }

    public removeOldTransactions(): { removed: number} {
        let removed = 0;
        Object.values(this.transactions)
            .filter(t => t.transactionPromise.reject === null
                && t.transactionPromise.resolve === null
                && t.createdAt.elapsedMs() > 86400000)
            .forEach(transaction => {
                delete this.transactions[transaction.transactionId];
                removed += 1;
            });
        return { removed };
    }

    private sendJSON(json: string): Time | null {
        try {
            const time: Time = new Time();
            this.WebSocket.send(json);
            return time;
        } catch (e) {
            Log.error(e.toString());
            return null;
        }
    }

    protected resolveTransaction(returnData: any, time: Time, transaction: Transaction<any, any>) {
        if (this.type === TransactionType.SOCKET) {
            transaction.response = {
                status: true,
                received: time,
                json: returnData
            };
        }
        transaction.status = TransactionStatus.successful;
        const {resolve} = transaction.transactionPromise;
        if (resolve !== null) {
            transaction.transactionPromise = {resolve: null, reject: null};
            if (transaction.type === TransactionType.STREAM) {
                Log.hidden(' Stream (' + transaction.transactionId + '): ' + transaction.command + ', ' + JSON.stringify(transaction.request.arguments), 'INFO');
                resolve({transaction});
            } else if (transaction.request.sent !== null) {
                const elapsedMs = transaction.response.received !== null && transaction.response.received.getDifference(transaction.request.sent);
                Log.hidden('Socket (' + transaction.transactionId + '): '
                    + transaction.command + ', '
                    + (transaction.command === 'login' ? '(arguments contains secret information)' : JSON.stringify(transaction.request.arguments))
                    + ', (' + elapsedMs + 'ms)', 'INFO');
                resolve({returnData, time, transaction})
            }
        }
        if (transaction.command !== 'ping') {
            Log.hidden('Transaction archived:\n' + Utils.transactionToJSONString(transaction), 'INFO', 'Transactions');
        }
    }

    protected rejectTransaction(
        json: { code: string, explain: string },
        transaction: Transaction<any, any>,
        interrupted: boolean = false,
        received: Time = new Time()
    ) {
        transaction.status = interrupted ? TransactionStatus.interrupted : TransactionStatus.timeout;
        transaction.response = {
            status: false,
            received,
            json
        };
        Log.hidden(transaction.type + ' message rejected (' + transaction.transactionId + '): '
            + transaction.command + ', '
            + (transaction.command === 'login' ? '(arguments contains secret information)' : JSON.stringify(transaction.request.arguments))
            + '\nReason:\n' + JSON.stringify(json, null, '\t'), 'ERROR');
        const {reject} = transaction.transactionPromise;
        if (reject !== null) {
            transaction.transactionPromise = {resolve: null, reject: null};
            reject({
                reason: json,
                transaction: transaction.command === 'login' ? Utils.hideSecretInfo(transaction) : transaction
            });
        }
        Log.hidden('Transaction archived:\n' + Utils.transactionToJSONString(transaction), 'INFO', 'Transactions');
    }

    protected sendMessage(transaction: Transaction<any, any>, addQueu: boolean): boolean {
        if (!this.isRateLimitReached()) {
            if (this.queueSize === 0 || !addQueu) {
                const sentTime = this.sendJSON(transaction.request.json);
                if (sentTime !== null) {
                    this.addElapsedTime(sentTime);
                    transaction.request.sent = sentTime;
                    transaction.status = (transaction.type === TransactionType.STREAM)
                        ? TransactionStatus.successful
                        : TransactionStatus.sent;
                    if (transaction.type === TransactionType.STREAM) {
                        this.resolveTransaction(null, new Time(), transaction);
                    }
                    return true;
                }
            }
        }

        if (addQueu) {
            this.addQueu(transaction);
        }

        if (this.queueSize > 0 && this.messageSender.isNull()) {
            this.callCleanQueuTimeout();
        }
        return false;
    }

    private callCleanQueuTimeout() {
        if (this.messagesElapsedTime.length <= 3) {
            this.tryCleanQueue();
        } else {
            const elapsedMs = this.messagesElapsedTime[this.messagesElapsedTime.length - 4].elapsedMs();
            const timeoutMs = Math.max(this.rateLimit - elapsedMs, 0);
            this.messageSender.setTimeout(() => {
                this.tryCleanQueue();
            }, timeoutMs);
        }
    }

    private tryCleanQueue() {
        while (this.queueSize > 0) {
            const urgent = this.messageQueues.urgent.length > 0;
            const {transactionId} = urgent ? this.messageQueues.urgent[0] : this.messageQueues.normal[0];
            if (this.transactions[transactionId].status === TransactionStatus.waiting) {
                const isSent = this.sendMessage(this.transactions[transactionId], false);
                if (!isSent) {
                    return;
                }
            }
            if (urgent) {
                this.messageQueues.urgent.shift();
            } else {
                this.messageQueues.normal.shift();
            }
        }
    }

    public isQueueContains(command: string) {
        return this.messageQueues.urgent.some(id => {
            return this.transactions[id.transactionId].command === command
        }) || this.messageQueues.normal.some(id => {
            return this.transactions[id.transactionId].command === command
        })
    }
}
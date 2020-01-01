import {TradePosition, Transaction} from '../interface/Interface';
import {CMD_FIELD, STREAMING_TRADE_RECORD, TRADE_RECORD} from '..';
import {PositionType} from '../enum/Enum';

export class Utils {

    static hideSecretInfo(transaction: Transaction<any, any>): Transaction<any, any> {
        return {
            ...transaction,
            request: {
                ...transaction.request,
                json: 'json contains secret information',
                arguments: {},
            }
        }
    }

    static parseCustomTag(customTag: string | null): { transactionId: string | null, command: string | null } {
        if (customTag == null) {
            return {transactionId: null, command: null};
        }
        const customTagData = customTag.split('_');
        if (customTagData.length < 2) {
            return {transactionId: null, command: null};
        }
        const command = customTagData[0];
        const transactionId = customTagData[1];
        return {transactionId, command};
    }

    static getObjectChanges(from: TradePosition, to: TradePosition) {
        const obj: any = {};
        Object.keys(from).filter(key => from[key] !== to[key]).forEach(key => {
            obj[key] = to[key];
        });
        return obj;
    }

    static formatPosition(t: STREAMING_TRADE_RECORD | TRADE_RECORD): TradePosition {
        return {
            close_time: t.close_time,
            closed: t.closed,
            cmd: t.cmd,
            comment: t.comment,
            commission: t.commission,
            customComment: t.customComment,
            digits: t.digits,
            expiration: t.expiration,
            margin_rate: t.margin_rate,
            offset: t.offset,
            open_price: t.open_price,
            open_time: t.open_time,
            order: t.order,
            order2: t.order2,
            position: t.position,
            sl: t.sl,
            storage: t.storage,
            symbol: t.symbol,
            tp: t.tp,
            volume: t.volume,
            position_type: Utils.getPositionType({ cmd: t.cmd, closed: t.closed, close_time: t.close_time})
        };
    };

    static transactionToJSONString(transaction: Transaction<any, any>): string {
        try {
            const response = JSON.stringify(transaction.response.json);
            const createdAtUTC = transaction.createdAt.getUTC();
            const sentUTC = transaction.request.sent == null ? null : transaction.request.sent.getUTC();
            const receivedUTC = transaction.response.received == null ? null : transaction.response.received.getUTC();
            return JSON.stringify({
                ...transaction,
                createdAt: transaction.createdAt === null || createdAtUTC === null ? null : createdAtUTC.getTime(),
                request: {
                    sent: transaction.request.sent === null || sentUTC == null ? null : sentUTC.getTime(),
                    arguments: transaction.command === 'login' ? {} : transaction.request.arguments,
                    json: transaction.command === 'login' ? '"json contains secret information"' : transaction.request.json
                },
                response: {
                    status: transaction.response.status,
                    received: transaction.response.received === null || receivedUTC == null ? null : receivedUTC.getTime(),
                    json: response === null || typeof (response) === 'undefined' ? null : (
                        (response.length > 1000) ? '"Too long response #xapi-node"' : response
                    )
                },
                transactionPromise: undefined
            }, null, '\t');
        } catch (e) {
            return '{}';
        }
    }

    static getUTCTimestampString(): string {
        return new Date().getTime().toString();
    }

    static formatNumber(number: number, length: number): string {
        let result = number.toString();
        return (length - result.length > 0)
            ? '0'.repeat(length - result.length) + result
            : result;
    }

    static getPositionType({cmd, closed, close_time}: {cmd: CMD_FIELD, closed: boolean, close_time: number}): PositionType {
        if (cmd === CMD_FIELD.SELL || cmd === CMD_FIELD.BUY) {
            return close_time === null && !closed
                ? PositionType.open
                : PositionType.closed;
        } else {
            return cmd === CMD_FIELD.BALANCE || cmd === CMD_FIELD.CREDIT
                ? PositionType.source
                : PositionType.limit;
        }
    }
}
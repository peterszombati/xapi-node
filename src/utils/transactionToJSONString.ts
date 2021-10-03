import {Transaction} from '../interface/Interface'
import {parseStack} from 'logger4'

export function transactionToJSONString(transaction: Transaction<any, any>): string {
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
      transactionPromise: undefined,
      stack: parseStack(transaction.stack || '').slice(1),
    })
  } catch (e) {
    console.error(e)
    return '{}'
  }
}

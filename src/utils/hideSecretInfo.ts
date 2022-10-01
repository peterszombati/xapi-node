import { Transaction } from '../interface/Interface'

export function hideSecretInfo(transaction: Transaction<any, any>): Transaction<any, any> {
  return {
    ...transaction,
    request: {
      ...transaction.request,
      json: 'json contains sensitive information',
      arguments: {},
    },
  }
}

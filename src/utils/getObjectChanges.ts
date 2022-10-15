/* eslint-disable */
import { TradeRecord } from '../core/TradeRecord'

export function getObjectChanges(from: TradeRecord, to: TradeRecord) {
  const obj: any = {}
  Object.keys(from)
    // @ts-ignore
    .filter(key => from[key] !== to[key])
    .forEach(key => {
      // @ts-ignore
      obj[key] = to[key]
    })
  return obj
}

import {TradeRecord} from '../core/TradeRecord'

export function getObjectChanges(from: TradeRecord, to: TradeRecord) {
  const obj: any = {}
  // @ts-ignore
  Object.keys(from).filter(key => from[key] !== to[key]).forEach(key => {
    // @ts-ignore
    obj[key] = to[key]
  })
  return obj
}
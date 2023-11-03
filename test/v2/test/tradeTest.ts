import {XAPI} from '../../../src/v2/core/XAPI'

export function tradeTest(x: XAPI): Promise<void> {
  const symbol = 'EURUSD'
  const volume = 0.01

  return new Promise(async (resolve, reject) => {
    try {
      await x.Stream.subscribe.getTrades()
      await x.Stream.subscribe.getTradeStatus()
      const r = await x.trading.buy({
        symbol,
        volume,
        limit: 0.0987
      }).transactionStatus
      const position = x.trading.limitPositions?.find(i => i.order === r.order && i.symbol === symbol && i.volume >= volume && i.open_price === 0.0987)
      if (!position) {
        throw new Error('position not found;' + JSON.stringify(x.trading.limitPositions?.map(i => i.valueOf())))
      }
      await x.trading.close({ order: position.position }).transactionStatus
      const position1 = x.trading.limitPositions?.find(i => i.position === position.position && i.symbol === symbol && i.volume >= volume && i.open_price === 0.0987)
      if (position1) {
        throw new Error('position found after close;' + JSON.stringify(x.trading.limitPositions?.map(i => i.valueOf())))
      }
      resolve()
    } catch (e) {
      reject(e)
    }
  })
}
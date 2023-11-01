import {XAPI} from '../../../src/v2/core/XAPI'

export function tradeTest(x: XAPI): Promise<void> {
  const symbol = 'EURUSD'
  const volume = 0.1

  return new Promise(async (resolve, reject) => {
    try {
      await x.trading.buy({
        symbol,
        volume,
      })
      const position = x.trading.openPositions?.find(i => i.symbol === symbol && i.volume >= volume)
      if (!position) {
        throw new Error('position not found;' + x.trading.openPositions)
      }
      await x.trading.close({ order: position.order })
      const position1 = x.trading.openPositions?.find(i => i.symbol === symbol && i.volume >= volume)
      if (position1) {
        throw new Error('position found after close;' + x.trading.openPositions)
      }
      resolve()
    } catch (e) {
      reject(e)
    }
  })
}
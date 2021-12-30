import {XAPI} from '../../src/core/XAPI'
import {TYPE_FIELD, CMD_FIELD} from '../../src'

export function tradeTest(x: XAPI) {
    const symbol = 'BITCOIN'
    const volume = 0.1

    return new Promise((resolve, reject) => {
        x.onReady(async () => {
            try {
                await x.Socket.send.tradeTransaction({
                    cmd: CMD_FIELD.BUY,
                    type: TYPE_FIELD.OPEN,
                    tp: 0,
                    sl: 0,
                    offset: 0,
                    expiration: x.serverTime + 10000,
                    order: 0,
                    price: 1,
                    symbol,
                    volume,
                    customComment: null,
                })
                const position = x.openPositions.find(i => i.symbol === symbol && i.volume >= volume)
                if (!position) {
                    throw new Error('position not found;' + JSON.stringify(x.openPositions))
                }
                await x.Socket.send.tradeTransaction({
                    cmd: CMD_FIELD.SELL,
                    type: TYPE_FIELD.CLOSE,
                    order: position.order,
                    price: 1,
                    symbol,
                    volume,
                })
                const position1 = x.openPositions.find(i => i.symbol === symbol && i.volume >= volume)
                if (position1) {
                    throw new Error('position found after close;' + JSON.stringify(x.openPositions))
                }
                resolve()
            } catch (e) {
                reject(e)
            }
            x.disconnect()
        })
    })
}
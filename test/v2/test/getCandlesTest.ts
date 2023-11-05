import {XAPI} from '../../../src/v2/core/XAPI'
import {PERIOD_FIELD} from '../../../src'

export function getCandlesTest(x: XAPI): Promise<void> {
    return new Promise(async (resolve, reject) => {
        try {
            const isEURUSDclosed = x.Time?.getUTCDay() === 6 || (x.Time?.getUTCDay() === 0 && x.Time.getUTCHours() < 22)
            || (x.Time?.getUTCDay() === 5 && x.Time.getUTCHours() >= 21)

            if (isEURUSDclosed) {
                throw new Error('unable to test when market closed')
            }

            x.Stream.listen.getCandles((data => {
                x.Stream.unSubscribe.getCandles('EURUSD')
                resolve()
            }))
            const socketId = x.Socket.getSocketId()
            await x.getPriceHistory({symbol:'EURUSD',period:PERIOD_FIELD.PERIOD_M1,socketId})
            const streamId = socketId && x.Socket.connections[socketId].streamId
            await x.Stream.subscribe.getCandles('EURUSD', streamId)
        } catch (e) {
            reject(e)
        }
    })
}
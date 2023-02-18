import { XAPI } from '../../../src/v2/core/XAPI'

export function getCandlesTest(x: XAPI): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            x.Stream.listen.getCandles((data => {
                x.Stream.unSubscribe.getCandles('EURUSD')
                resolve()
            }))
            x.Stream.subscribe.getCandles('EURUSD')
        } catch (e) {
            reject(e)
        }
    })
}
import { XAPI } from '../../src/v1/core/XAPI'
import { ConnectionStatus } from '../../src'

export function getCandlesTest(x: XAPI): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            x.Stream.listen.getCandles((data => {
                resolve()
            }))
            x.onReady(() => {
                console.log('Connection is ready')
                x.Stream.subscribe.getCandles('EURUSD')
            })
            x.onConnectionChange(status => {
                console.log(ConnectionStatus[status])
            })
        } catch (e) {
            reject(e)
        }
    })
}
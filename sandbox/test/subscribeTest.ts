import { XAPI } from '../../src/core/XAPI'
import { ConnectionStatus } from '../../src'

export function subscribeTest(x: XAPI): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      x.Stream.listen.getKeepAlive(data => {
        return resolve()
      })
      x.onReady(() => {
        console.log('Connection is ready')
        x.Stream.subscribe.getKeepAlive()
      })
      x.onConnectionChange(status => {
        console.log(ConnectionStatus[status])
      })
    } catch (e) {
      reject(e)
    }
  })
}

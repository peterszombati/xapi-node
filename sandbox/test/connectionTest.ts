import { XAPI } from '../../src/core/XAPI'
import { ConnectionStatus } from '../../src'

export function connectionTest(x: XAPI): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      x.onReady(() => {
        console.log('Connection is ready')
        return resolve()
      })
      x.onConnectionChange(status => {
        console.log(ConnectionStatus[status])
      })
    } catch (e) {
      reject(e)
    }
  })
}

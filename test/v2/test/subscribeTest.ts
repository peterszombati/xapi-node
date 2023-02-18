import { XAPI } from '../../../src/v2/core/XAPI'

export function subscribeTest(x: XAPI): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      x.Stream.listen.getKeepAlive(data => {
        return resolve()
      })
      x.Stream.subscribe.getKeepAlive()
    } catch (e) {
      reject(e)
    }
  })
}
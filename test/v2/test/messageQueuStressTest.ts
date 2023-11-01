import { XAPI } from '../../../src/v2/core/XAPI'
import { Time } from '../../../src'

export function messageQueuStressTest(x: XAPI): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      let start: Time | null = null
      let received = 0

      x.Socket.listen.getVersion(_ => {
        console.log('Test: getVersion')
        received += 1
        if (received === 30) {
          console.log('Test: successful - 30th message arrived after ' + start?.elapsedMs() + 'ms')
          return resolve()
        }
      })
      start = new Time()
      console.log('Test: started.')
      for (let i = 0; i < 30; i++) {
        x.Socket.send.getVersion()
      }
    } catch (e) {
      reject(e)
    }
  })
}
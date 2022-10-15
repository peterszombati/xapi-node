import { XAPI } from '../../src/core/XAPI'
import { Time } from '../../src'

export function messageQueuStressTest(x: XAPI): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      let start: Time | null = null
      let received = 0

      x.Socket.listen.getVersion(_ => {
        console.log('Test: getVersion')
        received += 1
        if (received === 10) {
          console.log('Test: successful - 10th message arrived after ' + start?.elapsedMs() + 'ms')
          return resolve()
        }
      })
      x.onReady(async () => {
        start = new Time()
        console.log('Test: started.')
        for (let i = 0; i < 10; i++) {
          /** this await is mandatory! otherwise:
           * 1.the connection would get jammed and the server would disconnect
           * 2. XAPI would restart the connection and call
           * 3. the onReady event would be fired creating an infinite loop
           */
          await x.Socket.send.getVersion()
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}
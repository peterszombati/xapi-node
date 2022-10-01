/* sensitive/sensitive.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

import { XAPI } from '../../src/core/XAPI'
import { Logger4V2 } from 'logger4'
import * as path from 'path'
import { Time } from '../../src'
import { parseLoginFile } from '../parseLoginFile'

export function messageQueuStressTest(jsonPath: string) {
  try {
    const login = parseLoginFile(jsonPath)

    const x = new XAPI({ ...login, logger: new Logger4V2() })
    x.connect()

    let start: Time | null = null
    let received = 0
    x.onReady(() => {
      start = new Time()
      console.log('Test: started.')
      for (let i = 0; i < 150; i++) {
        x.Socket.send.getVersion()
      }
      setTimeout(() => {
        if (received !== 150) {
          console.error('Test: failed')
          process.exit(1)
        } else {
          console.log('Test: successful')
          process.exit(0)
        }
      }, 40000)
    })
    x.Socket.listen.getVersion(returnData => {
      received += 1
      if (received === 150) {
        console.log('Test: 150. message arrived in ' + start?.elapsedMs() + 'ms')
      }
    })
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

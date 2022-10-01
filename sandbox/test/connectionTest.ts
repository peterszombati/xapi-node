/* sensitive/sensitive.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

import { XAPI } from '../../src/core/XAPI'
import { ConnectionStatus } from '../../src'
import { Logger4V2 } from 'logger4'
import { parseLoginFile } from '../parseLoginFile'

export function connectionTest(jsonPath: string) {
  try {
    const login = parseLoginFile(jsonPath)

    const x = new XAPI({ ...login, logger: new Logger4V2() })
    x.connect()
    x.onReady(() => {
      console.log('Connection is ready')
    })
    x.onConnectionChange(status => {
      console.log(ConnectionStatus[status])
    })
  } catch (e) {
    console.error(e)
    process.exit(1)
  }
}

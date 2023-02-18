import { parseLoginFile } from './parseLoginFile'
import * as path from 'path'
//import { tradeTest } from './test/tradeTest'
import { connectionTest } from './test/connectionTest'
//import { messageQueuStressTest } from './test/messageQueuStressTest'
//import { subscribeTest } from './test/subscribeTest'
//import { getCandlesTest } from './test/getCandlesTest'
import {XAPI} from "../../src/v2/core/XAPI"

const jsonPath = path.join(process.cwd(), 'sensitive', 'sensitive-demo-login.json')
/* sensitive/sensitive-demo-login.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

async function init(): Promise<XAPI> {
  const login = parseLoginFile(jsonPath)
  const x = new XAPI({ ...login })
  await x.connect()
  return x
}

describe('tests', () => {
  it('connectionTest', async function () {
    const x = await init()
    await connectionTest(x)
  })
/*
  it('messageQueuStressTest', async function () {
    this.timeout(8000)
    const x = await init()
    await messageQueuStressTest(x)
    x.disconnect()
  })

  it('candleTest', async function () {
    this.timeout(8000)
    const x = await init()
    await getCandlesTest(x)
    x.disconnect()
  })


  it('subscribeTest', async function () {
    this.timeout(8000)
    const x = await init()
    await subscribeTest(x)
    x.disconnect()
  })

  it('trade EURUSD', async function () {
    this.timeout(8000)
    const x = await init()
    await tradeTest(x)
    x.disconnect()
  })*/
})
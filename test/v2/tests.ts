import { parseLoginFile } from './parseLoginFile'
import * as path from 'path'
//import { tradeTest } from './test/tradeTest'
import { connectionTest } from './test/connectionTest'
//import { messageQueuStressTest } from './test/messageQueuStressTest'
//import { subscribeTest } from './test/subscribeTest'
//import { getCandlesTest } from './test/getCandlesTest'
import {XAPI} from "../../src/v2/core/XAPI"
import {tradeTest} from "./test/tradeTest";
import {subscribeTest} from "./test/subscribeTest";
import {getCandlesTest} from "./test/getCandlesTest";
import {messageQueuStressTest} from "./test/messageQueuStressTest";
import { Logger } from '../../src';
import { Counter } from '../../src';

const jsonPath = path.join(process.cwd(), 'sensitive', 'sensitive-demo-login.json')
/* sensitive/sensitive-demo-login.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

let x: XAPI | null = null
async function init(): Promise<XAPI> {
  if (!x || Object.keys(x.Socket.connections).length === 0) {
    const login = parseLoginFile(jsonPath)
    const l = new Logger()
    l.on({
      type: 'debug',
      callback: data => console.log(data)
    })
    l.on({
      type: 'transaction',
      callback: data => console.log(data)
    })
    l.on({
      type: 'error',
      callback: data => console.log(data)
    })
    l.on({
      type: 'info',
      callback: data => console.log(data)
    })
    const c = new Counter()
    c.on({
      callback: ({key,time,count}) => console.log(time.get().toISOString()+':'+key.join(':')+':'+count)
    })
    x = new XAPI({...login},l,c)
    await x.connect()
  }
  return x
}

describe('tests', () => {
  it('connectionTest', async function () {
    const x = await init()
    await connectionTest(x)
  })

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
  })
})
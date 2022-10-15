import { parseLoginFile } from './parseLoginFile'
import * as path from 'path'
import XAPI from '../src'
import { Logger4V2 } from 'logger4'
import { tradeTest } from './test/tradeTest'
import { connectionTest } from './test/connectionTest'
import { messageQueuStressTest } from './test/messageQueuStressTest'
import { subscribeTest } from './test/subscribeTest'

const jsonPath = path.join(process.cwd(), 'sensitive', 'sensitive-demo-login.json')

async function init(): Promise<XAPI> {
  const login = parseLoginFile(jsonPath)
  const x = new XAPI({ ...login, logger: new Logger4V2() })
  await x.connect()
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

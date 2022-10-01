import { parseLoginFile } from './parseLoginFile'
import * as path from 'path'
import XAPI from '../src'
import { Logger4V2 } from 'logger4'
import { tradeTest } from './test/tradeTest'

async function init(): Promise<XAPI> {
  const login = parseLoginFile(path.join(process.cwd(), 'sensitive', 'sensitive-demo-login.json'))
  const x = new XAPI({ ...login, logger: new Logger4V2() })
  await x.connect()
  return x
}

describe('tests', () => {
  it('init', async () => {
    await init()
  })

  it('trade EURUSD', async () => {
    const x = await init()
    await tradeTest(x)
  })
})

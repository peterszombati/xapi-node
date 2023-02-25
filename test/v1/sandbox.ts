import * as path from 'path'
import { Logger4V2 } from 'logger4'
import XAPI from '../../src'
import { parseLoginFile } from './parseLoginFile'
import { Writable } from 'stream'

describe('sandbox', () => {
  it('sandbox', async () => {
    const login = parseLoginFile(path.join(process.cwd(), 'sensitive', 'sensitive-demo-login.json'))

    const logger = new Logger4V2()
    const x = new XAPI({ ...login, logger, subscribeTrades: true })

    const info = new Writable()
    info._write = (chunk, encoding, next) => {
      console.log(chunk.toString())
      next()
    }
    x.logger.onStream('info', info)

    const error = new Writable()
    error._write = (chunk, encoding, next) => {
      console.error(chunk.toString())
      next()
    }
    x.logger.onStream('error', error)

    const debug = new Writable()
    debug._write = (chunk, encoding, next) => {
      console.log(chunk.toString())
      next()
    }
    x.logger.onStream('debug', debug)

    //x.onReady(() => {})

    x.onReject(() => {
      x.disconnect()
    })

    x.connect()

    return await new Promise<void>(resolve => resolve())
  })
})
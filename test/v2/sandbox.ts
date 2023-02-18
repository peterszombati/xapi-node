import * as path from 'path'
import { parseLoginFile } from './parseLoginFile'
import { Writable } from 'stream'
import {XAPI} from "../../src/v2/core/XAPI"

describe('sandbox', () => {
  it('sandbox', async () => {
    const login = parseLoginFile(path.join(process.cwd(), 'sensitive', 'sensitive-demo-login.json'))

    const x = new XAPI({ ...login })

    const info = new Writable()
    info._write = (chunk, encoding, next) => {
      console.log(chunk.toString())
      next()
    }

    const error = new Writable()
    error._write = (chunk, encoding, next) => {
      console.error(chunk.toString())
      next()
    }

    const debug = new Writable()
    debug._write = (chunk, encoding, next) => {
      console.log(chunk.toString())
      next()
    }

    x.connect()

    return await new Promise<void>(resolve => resolve())
  })
})
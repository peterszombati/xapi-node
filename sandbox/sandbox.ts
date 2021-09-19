import * as path from "path"
import Logger4 from "logger4"
import XAPI from "../src"
import {parseLoginFile} from "./parseLoginFile"

describe('sandbox', () => {
  it('sandbox', async () => {
    const login = parseLoginFile(path.join(process.cwd(), 'sensitive', 'sensitive-demo-login.json'))

    const logger = new Logger4({ printEnabled: false, directorySizeLimitMB: null, path: null })
    const x = new XAPI({...login, logger})

    x.logger.on((tag,a,b,c) => {
      if (tag === 'ERROR') {
        console.error(a)
      }
    })

    x.onReady(() => {

    })

    x.onReject(() => {
      x.disconnect()
    })

    x.connect()

    return await new Promise<any>(() => {})
  })
})
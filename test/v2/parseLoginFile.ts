import * as fs from 'fs'
import {parseJsonLogin} from '../../src/v2/utils/parseJsonLogin'
import {XAPIConfig} from '../../src/v2/core/XAPI'

export function parseLoginFile(loginJsonFile: string): XAPIConfig {
  if (!fs.existsSync(loginJsonFile)) {
    throw `${loginJsonFile} is not exists.`
  }
  return parseJsonLogin(fs.readFileSync(loginJsonFile).toString())
}
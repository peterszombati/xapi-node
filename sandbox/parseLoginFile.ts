import * as fs from 'fs'
import {parseJsonLogin, XAPIConfig} from '../src'

export function parseLoginFile(loginJsonFile: string): XAPIConfig {
    if (!fs.existsSync(loginJsonFile)) {
        throw `${loginJsonFile} is not exists.`
    }
    return parseJsonLogin(fs.readFileSync(loginJsonFile).toString())
}
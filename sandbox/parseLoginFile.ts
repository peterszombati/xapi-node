import * as fs from 'fs'
import {XAPIConfig} from '..'
import {parseJsonLogin} from '../src'

export function parseLoginFile(loginJsonFile: string): XAPIConfig {
    if (!fs.existsSync(loginJsonFile)) {
        throw `${loginJsonFile} is not exists.`
    }
    return parseJsonLogin(fs.readFileSync(loginJsonFile).toString())
}
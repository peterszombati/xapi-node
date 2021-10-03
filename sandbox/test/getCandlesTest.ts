/* sensitive/sensitive.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

import {XAPI} from '../../src/core/XAPI'
import {ConnectionStatus} from '../../src'
import {Logger4V2} from 'logger4'
import * as path from 'path'
import {parseLoginFile} from '../parseLoginFile'

export function getCandlesTest(jsonPath: string) {
    try {
        const login = parseLoginFile(jsonPath)

        const x = new XAPI({...login, logger: new Logger4V2()})
        x.connect()
        x.Stream.listen.getCandles((data => {
            process.exit(0)
        }))
        x.onReady(() => {
            console.log('Connection is ready')
            x.Stream.subscribe.getCandles('EURUSD')
        })
        x.onConnectionChange(status => {
            console.log(ConnectionStatus[status])
        })
    } catch (e) {
        console.error(e)
        process.exit(1)
    }

}
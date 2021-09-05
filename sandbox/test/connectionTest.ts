/* sensitive/sensitive.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

import {XAPI} from '../../src/core/XAPI';
import {ConnectionStatus, parseLogin} from '../../src';
import Logger4 from 'logger4';
import * as path from 'path';

export function connectionTest(jsonPath: string) {
    try {
        const login = parseLogin(jsonPath);
        const logger = new Logger4({
            printEnabled: true,
            path: path.join(process.cwd(), 'logs', 'xapi'),
            directorySizeLimitMB: null
        });
        const x = new XAPI({...login, logger});
        x.connect();
        x.onReady(() => {
            console.log('Connection is ready');
        });
        x.onConnectionChange(status => {
            console.log(ConnectionStatus[status]);
        });
    } catch (e) {
        console.error(e);
        process.exit(1);
    }

}
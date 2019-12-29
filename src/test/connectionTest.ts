/* sensitive/sensitive.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

import XAPI from '../core/XAPI';
import {ConnectionStatus, parseLogin} from '..';
import Logger4 from 'logger4';
import * as path from 'path';

process
    .on('unhandledRejection', (reason, p) => {
        console.error(reason, 'Unhandled Rejection at Promise', p);
    })
    .on('uncaughtException', err => {
        console.error(err, 'Uncaught Exception thrown');
        process.exit(1);
    });

export function connectionTest(jsonPath: string) {
    try {
        const login = parseLogin(jsonPath);
        const logger = new Logger4({path: path.join(process.cwd(), 'logs', 'xapi'), directorySizeLimitMB: null});
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
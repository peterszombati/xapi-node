/* sensitive/sensitive.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

import XAPI from '../core/XAPI';
import {CMD_FIELD, parseLogin, TYPE_FIELD} from '..';
import Logger4 from 'logger4';
import * as path from 'path';
import {Time} from '../modules/Time';

process
    .on('unhandledRejection', (reason, p) => {
        console.error(reason, 'Unhandled Rejection at Promise', p);
    })
    .on('uncaughtException', err => {
        console.error(err, 'Uncaught Exception thrown');
        process.exit(1);
    });

export function messageQueuStressTest(jsonPath: string) {
    try {
        const login = parseLogin(jsonPath);
        const logger = new Logger4({path: path.join(process.cwd(), 'logs', 'xapi'), maxDirectorySizeInMB: null});
        const x = new XAPI({...login, logger});
        x.connect();

        let start: Time | null = null;
        let received: number = 0;
        x.onReady(() => {
            start = new Time();
            console.log('Test: started.');
            for (let i = 0; i < 150; i++) {
                x.Socket.send.getVersion();
            }
            setTimeout(() => {
                if (received !== 150) {
                    console.error('Test: failed');
                    process.exit(1);
                } else {
                    console.log('Test: successful');
                    process.exit(0);
                }
            }, 40000);

        });

        x.Socket.send.tradeTransaction({
            cmd: CMD_FIELD.BUY_LIMIT,
            customComment: null,
            expiration: new Date().getTime() + 60000 * 60 * 24 * 365,
            offset: 0,
            order: 0,
            price: 21900,
            sl: 0,
            symbol: 'US30',
            tp: 26500,
            type: TYPE_FIELD.OPEN,
            volume: 0.2
        }).then(({returnData}) => {
            console.log('Success ' + returnData.order);
        }).catch(e => {
            console.error('Failed');
            console.error(e);
        });

        x.Socket.listen.getVersion((returnData) => {
            received += 1;
            if (received === 150) {
                console.log('Test: 150. message arrived in ' + start?.elapsedMs() + 'ms');
            }
        });
    } catch (e) {
        console.error(e);
        process.exit(1);
    }

}

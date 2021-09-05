/* sensitive/sensitive.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

import {XAPI} from '../../src/core/XAPI';
import {parseLogin} from '../../src';
import Logger4 from 'logger4';
import * as path from 'path';
import {Time} from '../../src';

export function messageQueuStressTest(jsonPath: string) {
    try {
        const login = parseLogin(jsonPath);
        const logger = new Logger4({
            printEnabled: true,
            path: path.join(process.cwd(), 'logs', 'xapi'),
            directorySizeLimitMB: null
        });
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
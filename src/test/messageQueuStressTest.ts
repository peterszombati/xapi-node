/* sensitive/sensitive.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

import XAPI, {XAPIConfig} from "../core/XAPI";
import {parseLogin} from "..";
import Logger4 from "logger4";
import * as path from 'path';
import {Time} from "../modules/Time";

process
	.on('unhandledRejection', (reason, p) => {
		console.error(reason, 'Unhandled Rejection at Promise', p);
	})
	.on('uncaughtException', err => {
		console.error(err, 'Uncaught Exception thrown');
		process.exit(1);
	});
export function messageQueuStressTest(jsonPath: string) {
	let login: XAPIConfig;
	try {
		login = parseLogin(jsonPath);
		const logger = new Logger4({ path: path.join(process.cwd(), "logs", "xapi"), removeOverDirectorySize: null });
		const x = new XAPI({...login, logger});
		x.connect();

		let start: Time = new Time(false);
		let received: number = 0;
		x.onReady(() => {
			start.reset();
			console.log("Test started.");
			for (let i = 0; i < 150; i++) {
				x.Socket.send.getVersion();
			}
			setTimeout(() => {
				if (received !== 150) {
					console.error("Test: failed");
					process.exit(1);
				} else {
					console.log("Test: successful");
					process.exit(0);
				}
			}, 40000);
		});

		x.Socket.listen.getVersion((returnData) => {
			received += 1;
		});
	} catch (e) {
		console.error(e);
		process.exit(1);
	}

}

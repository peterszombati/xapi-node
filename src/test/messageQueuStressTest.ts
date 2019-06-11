/* sensitive/sensitive.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

import XAPI from "../core/XAPI";
import {parseLogin} from "..";
process
	.on('unhandledRejection', (reason, p) => {
		console.error(reason, 'Unhandled Rejection at Promise', p);
	})
	.on('uncaughtException', err => {
		console.error(err, 'Uncaught Exception thrown');
		process.exit(1);
	});
export function messageQueuStressTest(jsonPath: string) {
	let login = null;
	try {
		login = parseLogin(jsonPath);
	} catch (e) {
		console.error(e);
		process.exit(1);
	}
	const x = new XAPI(login);
	x.connect();

	x.Socket.listen.getVersion((data, time) => {
		console.log(data);
	});

	x.onReady(() => {
		console.log("Ready: " + x.getAccountID());
		for (let i = 0; i < 150; i++) {
			x.Socket.send.getVersion()
		}
	});
}

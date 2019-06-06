/* src/sensitive.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

import * as fs from 'fs';
import * as path from 'path';
import XAPI, {XAPIConfig} from "../core/XAPI";
process
	.on('unhandledRejection', (reason, p) => {
		console.error(reason, 'Unhandled Rejection at Promise', p);
	})
	.on('uncaughtException', err => {
		console.error(err, 'Uncaught Exception thrown');
		process.exit(1);
	});
function test(jsonPath: string) {
	const login = path.join(process.cwd(), 'src', jsonPath);
	if (!fs.existsSync(login)) {
		console.error(`${login} is not exists.`);
		process.exit(1);
	}

	const {accountId, password, type}: XAPIConfig = JSON.parse(fs.readFileSync(login).toString().trim());
	if (typeof (accountId) !== "string"
		|| typeof (password) !== "string"
		|| typeof (type) !== "string") {
		console.error("sensitive.json is not valid");
		process.exit(1);
	}
	const x = new XAPI({accountId, password, type});
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

test("sensitive-demo.json");

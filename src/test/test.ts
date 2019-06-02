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

	x.Stream.listen.getCandles((data, time) => {
		console.log(data);
	});

	x.onReady(() => {
		console.log("Ready: " + x.getAccountID());
		x.Stream.subscribe.getCandles("ETHEREUM").then((d) => {
			console.log(d);
		}).catch(e => {
			console.error(e);
		})
	});
}

test("sensitive-demo.json");

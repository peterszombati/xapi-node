/* src/sensitive.json
{
	"accountId": "",
	"password": "",
	"type": "real"
}
 */

import * as fs from 'fs';
import * as path from 'path';
import XAPI from "../core/XAPI";

// sensitive.json
const login = path.join(process.cwd(), 'src', 'sensitive.json');
if (!fs.existsSync(login)) {
	console.error(`${login} is not exists.`);
	process.exit(1);
}

const { accountId, password, type } = JSON.parse(fs.readFileSync(login).toString().trim());
if (typeof(accountId) !== "string" || typeof(password) !== "string" || typeof(type) !== "string") {
	console.error("sensitive.json is not valid");
	process.exit(1);
}
// #1 test
const x = new XAPI(accountId, password, type);
x.connect();
x.onReady(() => {
	console.log("Ready");
});

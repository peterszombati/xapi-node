import * as fs from 'fs';
import {XAPIConfig} from "..";

export function parseLogin(loginJsonFile: string): { accountId: string, password: string, type: string } {
	if (!fs.existsSync(loginJsonFile)) {
		throw `${loginJsonFile} is not exists.`
	}
	let json: any = {};
	try {
		json = JSON.parse(fs.readFileSync(loginJsonFile).toString().trim())
	} catch (e) {
		throw `${loginJsonFile} is not valid json file\n${e}`;
	}
	if (typeof(json) !== 'object') {
		throw `${loginJsonFile} is not valid json file\n${typeof(json)}`;
	}

	const {accountId, password, type, rateLimit, host, appName}: XAPIConfig = json;
	if (typeof (accountId) !== "string"
	||	typeof (password) !== "string"
	||	typeof (type) !== "string"
	||	!['undefined', 'number'].includes(typeof (rateLimit))
	||	!['undefined', 'string'].includes(typeof (host))
	||	!['undefined', 'string'].includes(typeof (appName))
	||	Object.keys(json).length > 6) {
		throw `${loginJsonFile} is not valid`
	}
	if (["real", "demo"].every(x => x !== type.toLowerCase())) {
		throw `${loginJsonFile} not contains valid type (it should be 'real' or 'demo')`;
	}
	return { accountId, password, type: type.toLowerCase() };
}

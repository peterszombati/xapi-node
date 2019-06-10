import * as fs from 'fs';
import * as path from 'path';
import {XAPIConfig} from "..";

export function parseLogin(loginJsonFile: string): {accountId: string, password: string, type: string} {
	if (!fs.existsSync(loginJsonFile)) {
		throw `${loginJsonFile} is not exists.`
	}
	let json: any = {};
	try {
		json = JSON.parse(fs.readFileSync(loginJsonFile).toString().trim())
	} catch (e) {
		throw `${loginJsonFile} is not valid json file`;
	}

	const {accountId, password, type}: XAPIConfig = json;
	if (typeof (accountId) !== "string"
	||	typeof (password) !== "string"
	||	typeof (type) !== "string") {
		throw `${loginJsonFile} is not valid`
	}
	if (["real", "demo"].every(x => x !== type.toLowerCase())) {
		throw `${loginJsonFile} not contains valid type (it should be 'real' or 'demo')`;
	}
	return { accountId, password, type: type.toLowerCase() };
}

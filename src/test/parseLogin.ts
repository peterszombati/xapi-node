import * as fs from 'fs';
import * as path from 'path';
import {XAPIConfig} from "..";

export function parseLogin(file: string): {accountId: string, password: string, type: string} {
	const login = path.join(process.cwd(), "sensitive", file);
	if (!fs.existsSync(login)) {
		throw `${login} is not exists.`
	}
	const {accountId, password, type}: XAPIConfig = JSON.parse(fs.readFileSync(login).toString().trim());
	if (typeof (accountId) !== "string"
	||	typeof (password) !== "string"
	||	typeof (type) !== "string") {
		throw `${login} is not valid`
	}
	if (["real", "demo"].every(x => x !== type.toLowerCase())) {
		throw `${login} not contains valid type (it should be 'real' or 'demo')`;
	}
	return { accountId, password, type: type.toLowerCase() };
}

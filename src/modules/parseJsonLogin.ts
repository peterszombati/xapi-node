import {XAPIConfig} from '..'

export function parseJsonLogin(jsonString: string): XAPIConfig {
    let json: any = {};
    try {
        json = JSON.parse(jsonString.trim())
    } catch (e) {
        throw new Error('json parse failed')
    }
    if (typeof (json) !== 'object') {
        throw new Error(`json is not valid (typeof = ${typeof (json)})`)
    }

    const {accountId, password, type, rateLimit, host, appName}: XAPIConfig = json;
    if (typeof (accountId) !== 'string'
        || typeof (password) !== 'string'
        || typeof (type) !== 'string'
        || !['undefined', 'number'].includes(typeof (rateLimit))
        || !['undefined', 'string'].includes(typeof (host))
        || !['undefined', 'string'].includes(typeof (appName))
        || Object.keys(json).length > 6) {
        throw new Error(`json is not valid`)
    }
    if (['real', 'demo'].every(x => x !== type.toLowerCase())) {
        throw new Error(`json not contains valid type (it should be 'real' or 'demo')`)
    }
    return {accountId, password, type: type.toLowerCase(), rateLimit, host, appName};
}
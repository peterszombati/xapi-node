export function parseJsonLogin(jsonString: string): { accountId: string, password: string, accountType: 'real' | 'demo', rateLimit?: number, host?: string, appName?: string, tradingDisabled?: boolean } {
    let json: any = {}
    try {
        json = JSON.parse(jsonString.trim())
    } catch (e) {
        throw new Error('json parse failed')
    }
    if (typeof json !== 'object') {
        throw new Error(`json is not valid (typeof = ${typeof json})`)
    }

    let {
        accountId,
        password,
        accountType,
        type,
        rateLimit,
        host,
        appName,
        tradingDisabled
    }: { accountId: string, password: string, accountType?: 'real' | 'demo', type?: 'real' | 'demo', rateLimit?: number, host?: string, appName?: string, tradingDisabled?: boolean } = json
    accountType ||= type
    if (
        typeof accountId !== 'string' ||
        typeof password !== 'string' ||
        typeof accountType !== 'string' ||
        !['undefined', 'number'].includes(typeof rateLimit) ||
        !['undefined', 'string'].includes(typeof host) ||
        !['undefined', 'string'].includes(typeof appName) ||
        !['undefined', 'boolean'].includes(typeof tradingDisabled) ||
        Object.keys(json).length > 7
    ) {
        throw new Error('json is not valid')
    }
    if (!accountType || ['real', 'demo'].every(x => x !== accountType?.toLowerCase())) {
        throw new Error('json not contains valid "accountType" (it should be "real" or "demo")')
    }
    return {
        accountId,
        password,
        accountType: accountType.toLowerCase() as 'real' | 'demo',
        rateLimit,
        host,
        appName,
        tradingDisabled
    }
}
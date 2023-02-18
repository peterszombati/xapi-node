export function parseCustomTag(customTag: string | null): { transactionId: string | null; command: string | null } {
    if (!customTag) {
        return {transactionId: null, command: null}
    }
    const [command,transactionId] = customTag.split('_')
    if (!transactionId) {
        return {transactionId: null, command: null}
    }
    return {transactionId, command}
}
export function parseCustomTag(customTag: string | null): { transactionId: string | null; command: string | null } {
  if (customTag == null) {
    return { transactionId: null, command: null }
  }
  const customTagData = customTag.split('_')
  if (customTagData.length < 2) {
    return { transactionId: null, command: null }
  }
  const command = customTagData[0]
  const transactionId = customTagData[1]
  return { transactionId, command }
}

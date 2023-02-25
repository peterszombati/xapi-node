export function formatNumber(number: number, length: number): string {
  const result = number.toString()
  return length - result.length > 0
      ? '0'.repeat(length - result.length) + result
      : result
}
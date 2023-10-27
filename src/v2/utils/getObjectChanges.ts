export function getObjectChanges(from: Record<string, any>, to: Record<string, any>) {
  const obj: Record<string, any> = {}

  for (const [key, value] of Object.entries(from)) {
    if (value !== to[key]) {
      obj[key] = to[key]
    }
  }

  return obj
}
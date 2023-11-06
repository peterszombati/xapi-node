export function isEmpty(obj: Record<string, any>) {
  for (const prop in obj) {
    if (obj.hasOwnProperty(prop))
      return false
  }
  return true
}
export function getObjectChanges(from: Record<string, any>, to: Record<string, any>) {
    const obj: Record<string, any> = {}
    Object.keys(from)
        .filter(key => from[key] !== to[key])
        .forEach(key => {
            obj[key] = to[key]
        })
    return obj
}
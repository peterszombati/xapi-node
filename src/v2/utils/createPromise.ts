export type PromiseObject<T,E = Error> = {
    resolve: (data: T) => void
    reject: (err: E) => void
    promise: Promise<T>
}

export function createPromise<T, E = Error>(): PromiseObject<T,E> {
    let resolve, reject
    const promise = new Promise<T>((_resolve, _reject) => {
        resolve = _resolve
        reject = _reject
    })

    return {
        promise,
        // @ts-ignore
        resolve,
        // @ts-ignore
        reject,
    }
}
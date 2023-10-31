import {Listener} from "./Listener"
import {Time} from "./Time"

export class Counter<T = string> extends Listener {
  on({
       callback,
       key,
     }: ({
    callback: (data: { key: string[], time: Time, count: number }) => void
    key?: string | null
  })) {
    return this.addListener( 'Counter', callback, key)
  }

  count(key: string[], count: number = 1): void {
    this.callListener('Counter', [{
      key: key.length === 1 ? ['data', key[0]] : key,
      time:new Time(),
      count
    }])
  }
}
import {Listener} from "./Listener"

type X = Record<string, any> | string

export class Logger<T = X, I = X, W = X, E = X, D = X> extends Listener {
  on({
       type,
       callback,
       key,
     }: ({
    type: string
    callback: (data: Record<string, any> | string) => void
    key?: string | null
  } | {
    type: 'transaction'
    callback: (data: T) => void
    key?: string | null
  } | {
    type: 'info'
    callback: (data: I) => void
    key?: string | null
  } | {
    type: 'warn'
    callback: (data: W) => void
    key?: string | null
  } | {
    type: 'error'
    callback: (data: E) => void
    key?: string | null
  } | {
    type: 'debug'
    callback: (data: D) => void
    key?: string | null
  })) {
    return this.addListener(type, callback, key)
  }

  call(type: string, data: Record<string, any> | string): void {
    this.callListener(type, [data])
  }

  transaction(data: T) {
    this.callListener('transaction', [data])
  }

  info(data: I) {
    this.callListener('info', [data])
  }

  warn(data: W) {
    this.callListener('warn', [data])
  }

  error(data: E) {
    this.callListener('error', [data])
  }

  debug(data: D) {
    this.callListener('debug', [data])
  }
}
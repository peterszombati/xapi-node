import {Logger4V2} from 'logger4'

export let Log = new Logger4V2()

export let changeLogger = (_logger: Logger4V2) => {
  Log = _logger
}

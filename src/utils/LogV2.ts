import {Logger4V2} from 'logger4'

export let LogV2 = new Logger4V2()

export let changeLogger = (_logger: Logger4V2) => {
  LogV2 = _logger
}

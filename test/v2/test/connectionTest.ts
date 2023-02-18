import { XAPI } from '../../../src/v2/core/XAPI'

export function connectionTest(x: XAPI): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      resolve()
    } catch (e) {
      reject(e)
    }
  })
}
[![Logo](https://github.com/peterszombati/xapi-node/raw/master/docs/xtb-logo.png)](https://www.xtb.com/en)

# xapi-node

This project makes it possible to get data from Forex market, execute market or limit order with NodeJS/JS through WebSocket connection

This module may can be used for [X-Trade Brokers](https://www.xtb.com/en) xStation5 accounts

WebSocket protocol description: https://peterszombati.github.io/xapi-node/

This module is usable on Front-end too.



## Getting started

### 1. Install via [npm](https://www.npmjs.com/package/xapi-node)

```
npm i xapi-node
```

### 2. Example usage
#### Authentication
```ts
// TypeScript
import XAPI from 'xapi-node'

const x = new XAPI({
    accountId: '(xStation5) accountID',
    password: '(xStation5) password',
    type: 'real' // or demo
})

(async () => {
  await x.connect()
  console.log('Connection is ready')
  x.disconnect().then(() => console.log('Disconnected'))
})().catch((e) => {
  console.error(e)
})
```
#### Authentication only for XTB accounts
```ts
// TypeScript
import XAPI from 'xapi-node'

const x = new XAPI({
    accountId: '(xStation5) accountID',
    password: '(xStation5) password',
    host: 'ws.xtb.com', // only for XTB accounts
    type: 'real' // or demo
})

(async () => {
  await x.connect()
  x.disconnect().then(() => console.log('Disconnected'))
})().catch((e) => {
  console.error(e)
})
```

#### placing buy limit on BITCOIN [CFD]
```ts
x.Socket.send.tradeTransaction({
    cmd: CMD_FIELD.BUY_LIMIT,
    customComment: null,
    expiration: new Date().getTime() + 60000 * 60 * 24 * 365,
    offset: 0,
    order: 0,
    price: 100,
    sl: 0,
    symbol: 'BITCOIN',
    tp: 8000,
    type: TYPE_FIELD.OPEN,
    volume: 10
}).then(({order}) => {
    console.log('Success ' + order)
}).catch(e => {
    console.error('Failed')
    console.error(e)
})
```

#### placing buy limit on US30 (Dow Jones Industrial Average)
```ts
x.Socket.send.tradeTransaction({
    cmd: CMD_FIELD.BUY_LIMIT,
    customComment: null,
    expiration: new Date().getTime() + 60000 * 60 * 24 * 365,
    offset: 0,
    order: 0,
    price: 21900,
    sl: 0,
    symbol: 'US30',
    tp: 26500,
    type: TYPE_FIELD.OPEN,
    volume: 0.2
}).then(({order}) => {
    console.log('Success ' + order)
}).catch(e => {
    console.error('Failed')
    console.error(e)
})
```

#### get live EURUSD price data changing
```ts
x.Stream.listen.getTickPrices((data) => {
    console.log(data.symbol + ': ' + data.ask + ' | ' + data.askVolume + ' volume | ' + data.level + ' level' )
})

(async () => {
  await x.connect()
  x.Stream.subscribe.getTickPrices('EURUSD')
    .catch(() => { console.error('subscribe for EURUSD failed')})
})()

/* output
EURUSD: 1.10912 | 500000 volume | 0 level
EURUSD: 1.10913 | 1000000 volume | 1 level
EURUSD: 1.10916 | 1000000 volume | 2 level
EURUSD: 1.10922 | 3000000 volume | 3 level
EURUSD: 1.10931 | 3500000 volume | 4 level
...
*/
```
#### get EURUSD M1 price history
```ts
(async () => {
  await x.connect()
  x.getPriceHistory({
    symbol:'EURUSD',
    period: PERIOD_FIELD.PERIOD_M1
  }).then(({candles, digits}) => {
    console.log(candles.length)
    console.log(candles[0])
    console.log('digits = ' + digits)
  })
})()
```
#### market buy EURUSD (1.0 lot / 100000 EUR)
```ts
(async () => {
  await x.connect()
  x.Socket.send.tradeTransaction({
    cmd: CMD_FIELD.BUY,
    customComment: null,
    expiration: x.serverTime + 5000,
    offset: 0,
    order: 0,
    price: 1,
    symbol: 'EURUSD',
    tp: 0,
    sl: 0,
    type: TYPE_FIELD.OPEN,
    volume: 1
  }).then(({order}) => {
    console.log('Success ' + order)
  }).catch(e => {
    console.error('Failed')
    console.error(e)
  })
})()
```
#### modify open position (for example set new stop loss)
```ts
(async () => {
  await x.connect()
  x.Socket.send.tradeTransaction({
    order: 1234, // position number you can find it in (x.positions)
    type: TYPE_FIELD.MODIFY,
    sl: 1.05, // new stop loss level
  }).then(({order}) => {
    console.log('Success ' + order)
  }).catch(e => {
    console.error('Failed')
    console.error(e)
  })
})()
```
#### How to use other log modules than Logger4
```ts
// TODO
```

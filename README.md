# xapi-node

This project is made possible to get data from Forex market, execute market or limit order with NodeJS/JS through WebSocket connection

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
import XAPI from 'xapi-node';

const x = new XAPI({
    accountId: '(xStation5) accountID',
    password: '(xStation5) password',
    type: 'real' // or demo
});

x.connect();

x.onReady(() => {
    console.log('Connection is ready');
});
x.onReject((e) => {
    console.error(e);
});
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
}).then(({returnData}) => {
    console.log('Success ' + returnData.order);
}).catch(e => {
    console.error('Failed');
    console.error(e);
});
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
}).then(({returnData}) => {
    console.log('Success ' + returnData.order);
}).catch(e => {
    console.error('Failed');
    console.error(e);
});
```

#### Listening EURUSD price data
```ts
x.Stream.listen.getTickPrices((data) => {
    console.log(data.symbol + ': ' + data.ask + ' | ' + data.askVolume + ' volume | ' + data.level + ' level' );
});

x.onReady(() => {
    x.Stream.subscribe.getTickPrices('EURUSD')
        .catch(() => { console.error('subscribe for EURUSD failed')});
});
/* output
EURUSD: 1.10912 | 500000 volume | 0 level
EURUSD: 1.10913 | 1000000 volume | 1 level
EURUSD: 1.10916 | 1000000 volume | 2 level
EURUSD: 1.10922 | 3000000 volume | 3 level
EURUSD: 1.10931 | 3500000 volume | 4 level
...
*/
```
#### get EURUSD M1 candle chart
```ts
x.onReady(() => {
    x.loadChart({
        symbol:'EURUSD',
        period: PERIOD_FIELD.PERIOD_M1
    }).then(({ candles, digits}) => {
        console.log(candles.length);
        console.log(candles[0]);
        console.log('digits = ' + digits);
    })
});
```

## Donation
Now you can donate these projects with bitcoin

BTC: 3Kng1TWvE8qzuoqYqeA2KmMcGucPZFJ75F [www.blockchain.com](https://www.blockchain.com/btc/address/3Kng1TWvE8qzuoqYqeA2KmMcGucPZFJ75F)

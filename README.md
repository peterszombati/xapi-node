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
```ts
// TypeScript
import XAPI from "xapi-node";

const x = new XAPI({
    accountId: "(xStation5) accountID",
    password: "(xStation5) password",
    type: "real" // or demo
});

x.connect();

x.Socket.listen.getTradesHistory((history, time, transaction) => {
    console.log(history[0]);
    console.log(history.length);
});

x.onReady(() => {
    x.Socket.send.getTickPrices(["EURUSD"]).then(({ returnData, time, transaction }) => {
        console.log(returnData.quotations[0]);
    });

    x.Socket.send.getTradesHistory(1,0);
});
```

### 3. Example placing buy limit on BITCOIN [CFD]
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

### 4. Example placing buy limit on US30 (Dow Jones Industrial Average)
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

### 5. Listening EURUSD price data
```ts
x.Stream.listen.getTickPrices((data) => {
    console.log(data.symbol + ': ' + data.ask + ' price | ' + data.askVolume + ' volume');
});

x.onReady(() => {
    x.Stream.subscribe.getTickPrices('EURUSD')
        .catch(() => { console.error('subscribe for EURUSD failed')});
});
/* output
EURUSD: 1.10912 price | 500000 volume
EURUSD: 1.10913 price | 1000000 volume
EURUSD: 1.10916 price | 1000000 volume
EURUSD: 1.10922 price | 3000000 volume
EURUSD: 1.10931 price | 3500000 volume
...
*/
```

## Donation
Now you can donate these projects with bitcoin

BTC: 3Kng1TWvE8qzuoqYqeA2KmMcGucPZFJ75F [www.blockchain.com](https://www.blockchain.com/btc/address/3Kng1TWvE8qzuoqYqeA2KmMcGucPZFJ75F)

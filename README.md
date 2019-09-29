# xapi-node

This project is make possible to get data from market, execute order or limit orders with NodeJS through WebSocket connection

This module can be used for [X-Trade Brokers](https://www.xtb.com/en) xStation5 accounts

WebSocket protocol description: http://developers.xstore.pro/documentation/

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

### You can donate if you want
BTC: 3Kng1TWvE8qzuoqYqeA2KmMcGucPZFJ75F

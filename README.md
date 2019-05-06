# xapi-node

This project is make possible to get data from market, execute order or limit orders with NodeJS through WebSocket connection

It can be used for [X-Trade Brokers](https://www.xtb.com/en) xStation5 accounts

WebSocket communication documentation: http://developers.xstore.pro/documentation/

This module is usable on Front-end too.

## Getting started

### 1. Install 

```
npm i xapi-node
```

### 2. Example usage
```ts
// TypeScript
import XAPI from "xapi-node";

const x = new XAPI("(xStation5) accountID", "(xStation5) password", "real");

x.connect();

x.Socket.listen.getTradesHistory((history, time, transaction) => {
	console.log(history[0]);
	console.log(history.length);
});

x.onReady(() => {
	x.Socket.send.getTickPrices(["EURUSD"]).then((resolve) => {
		const { returnData, time, transaction } = resolve;
		console.log(returnData.quotations[0]);
	});

	x.Socket.send.getTradesHistory(1,0);
});
```

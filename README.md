# xapi-node

this package is make possible to execute order or limit orders from NodeJS through WebSocket connection

and its compatible with [X-Trade Brokers](https://www.xtb.com/en) xStation5 platform

WebSocket communication docs: http://developers.xstore.pro/documentation/

### Example usage
```ts
const x = new XAPI("accountID", "password", "real");

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

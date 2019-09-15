export enum errorCode {
	XAPINODE_0 = 'XAPINODE_0', // Each command invocation should not contain more than 1kB of data.
	XAPINODE_1 = 'XAPINODE_1', // WebSocket closed

	XAPINODE_3 = 'XAPINODE_3', // Transaction timeout (60s)
	XAPINODE_BE103 = 'XAPINODE_BE103', // User is not logged
	BE005 = 'BE005', // "userPasswordCheck: Invalid login or password"
	BE118 = 'BE118' // User already logged
}

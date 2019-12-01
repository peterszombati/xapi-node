import { EmptyLogger, Logger4Interface } from 'logger4';

export let Log: Logger4Interface = new EmptyLogger();
export let changeLogger = (logger: Logger4Interface) => {
	Log = logger;
};
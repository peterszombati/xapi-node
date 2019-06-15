import {Logger4Interface, EmptyLogger} from "logger4";

class Logger {
	private static _log: Logger4Interface = new EmptyLogger();

	static setLogger(logger: Logger4Interface) {
		this._log = logger;
	}

	static get log() {
		return this._log;
	}
}

export default Logger;

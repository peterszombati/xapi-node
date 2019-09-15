import Stream from "./Stream/Stream";
import Socket from "./Socket/Socket";
import Utils from "../utils/Utils";
import {Listener} from "../modules/Listener";
import Logger from "../utils/Logger";
import {Logger4Interface, EmptyLogger} from "logger4";

export const DefaultHostname = 'ws.xtb.com';

export interface XAPIConfig {
	accountId: string,
	password: string,
	type: string,
	appName ?: string,
	host ?: string | undefined,
	rateLimit ?: number | undefined,
	logger ?: Logger4Interface
}

export interface XAPIAccount {
	accountId: string,
	type: string,
	appName ?: string | undefined,
	host: string
}

export class XAPI extends Listener {

	public Stream: Stream;
	public Socket: Socket;
	private _tryReconnect: boolean = false;
	public get tryReconnect() { return this._tryReconnect; }
	private _rateLimit: number = 850;
	public get rateLimit() { return this._rateLimit; }
	private timer: { interval: any[], timeout: any[] } = {
		interval: [],
		timeout: []
	};

	constructor({
		accountId,
		password,
		type,
		appName = undefined,
		host = DefaultHostname,
		rateLimit = 850,
		logger = new EmptyLogger()}: XAPIConfig) {
		super();
		Logger.setLogger(logger);
		this._rateLimit = rateLimit;
		this.Socket = new Socket(this, password);
		this.Stream = new Stream(this);
		if (accountId != null && password != null && type != null) {
			this.account = {
				type: (type.toLowerCase() === "real") ? "real" : "demo",
				accountId,
				appName,
				host
			};
		}
		this.Stream.onConnectionChange(status => {
			if (this.Socket.status) {
				this.callListener("xapiConnectionChange", [status]);
			}
		});
		this.Socket.onConnectionChange(status => {
			if (this.Stream.status) {
				this.callListener("xapiConnectionChange", [status]);
			}
		});

		this.Socket.listen.login((data, time, transaction) => {
			this.setSession(data.streamSessionId);
		});

		this.Socket.onConnectionChange(status => {
			if (!status) {
				this.Stream.session = '';
				this.stopTimer();
			}
		});

		this.addListener("xapiReady", () => {
			this.stopTimer();

			this.timer.interval.push(setInterval(() => {
				if (this.Socket.status) {
					this.Socket.ping();
				}
				if (this.Stream.status) {
					this.Stream.ping();
				}
				this.timer.timeout.push(setTimeout(() => {
					if (this.Socket.status) {
						this.Socket.send.getServerTime();
					}
				}, 1000));
				this.timer.timeout.push(setTimeout(() => {
					if (this.Socket.status) {
						this.Socket.send.getTrades();
					}
				}, 2000));

				this.Socket.rejectOldTransactions();
				this.Stream.rejectOldTransactions();
				if (Object.keys(this.Socket.transactions).length > 20000) {
					this.Socket.removeOldTransactions();
				}
				if (Object.keys(this.Stream.transactions).length > 20000) {
					this.Stream.removeOldTransactions();
				}
			}, 19000));
		}, "constructor");
	}

	private stopTimer() {
		this.timer.interval.forEach(i => clearInterval(i));
		this.timer.timeout.forEach(i => clearTimeout(i));
		this.timer = { interval: [], timeout: [] };
	}

	protected account: XAPIAccount = {
		type: "demo",
		accountId: "",
		host: "",
		appName: undefined
	};

	public get accountType(): string | null {
		return this.account.type;
	}

	public get accountId(): string {
		return this.account.accountId;
	}

	public get appName(): string | undefined {
		return this.account.appName;
	}

	public get hostName(): string {
		return this.account.host;
	}

	public setSession(session: string) {
		this.Stream.session = session;
		if (this.Stream.status && session !== null && session.length > 0) {
			this.Stream.ping();
			this.callListener("xapiReady");
		}
	}

	public connect() {
		this._tryReconnect = true;
		this.Stream.connect();
		this.Socket.connect();
	}

	public get isConnectionReady() {
		return this.Stream.status && this.Socket.status;
	}

	public disconnect() {
		return new Promise((resolve, reject) => {
			this.Stream.session = '';
			this._tryReconnect = false;
			this.Stream.closeConnection();
			if (this.Socket.status) {
				this.Socket.logout()
					.catch(() => {})
					.then(() => {
						this.Socket.closeConnection();
						resolve();
					});
			} else {
				this.Socket.closeConnection();
				resolve();
			}
		});
	}

	public onReady(callBack: () => void, key: string = "default") {
		if (this.Stream.session.length > 0 && this.isConnectionReady) {
			callBack();
		}
		this.addListener("xapiReady", callBack, key);
	}

	public onConnectionChange(callBack: (status: boolean) => void, key: string | null = null) {
		this.addListener("xapiConnectionChange", callBack, key);
	}

}

export default XAPI;

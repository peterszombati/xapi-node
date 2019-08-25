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
	private pingTimer: any = null;
	private _transactionIdIncrement: number = 0;
	private _rateLimit: number = 850;
	public get rateLimit() { return this._rateLimit; }

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
			this.setAccount(accountId, type, appName, host);
		}

		this.Socket.listen.login((data, time, transaction) => {
			this.setSession(data.streamSessionId);
		});

		this.addListener("xapiReady", () => {
			if (this.pingTimer != null) {
				clearInterval(this.pingTimer);
			}

			this.pingTimer = setInterval(() => {
				if (this.Socket.status) {
					this.Socket.ping();
				}
				if (this.Stream.status) {
					this.Stream.ping();
				}
				setTimeout(() => {
					if (this.Socket.status) {
						this.Socket.send.getServerTime();
					}
				}, 1000);
				setTimeout(() => {
					if (this.Socket.status) {
						this.Socket.send.getTrades();
					}
				}, 2000);

				this.Socket.rejectOldTransactions();
				this.Stream.rejectOldTransactions();
				if (Object.keys(this.Socket.transactions).length > 20000) {
					this.Socket.removeOldTransactions();
				}
				if (Object.keys(this.Stream.transactions).length > 20000) {
					this.Stream.removeOldTransactions();
				}
			}, 19000);
		}, "constructor");
	}

	public createTransactionId(): string {
		this._transactionIdIncrement += 1;
		if (this._transactionIdIncrement > 9999) {
			this._transactionIdIncrement = 0;
		}
		return Utils.getUTCTimestamp().toString() + Utils.formatNumber(this._transactionIdIncrement, 4);
	}

	protected account: XAPIAccount = {
		type: "demo",
		accountId: "",
		host: "",
		appName: undefined
	};

	public getAccountType(): string | null {
		return this.account.type;
	}

	public getAccountID(): string {
		return this.account.accountId;
	}

	public getAppName(): string | undefined {
		return this.account.appName;
	}

	public getHostname(): string {
		return this.account.host;
	}

	protected setAccount(
		accountId: string,
		type: string,
		appName: string | undefined = undefined,
		host: string = DefaultHostname) {
		this.account = {
			type: (type.toLowerCase() === "real") ? "real" : "demo",
			accountId,
			appName,
			host
		};
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

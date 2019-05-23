import Stream from "./Stream/Stream";
import Socket from "./Socket/Socket";
import Utils from "../utils/Utils";
import {Listener} from "../modules/Listener";

export interface XAPILogin {
	accountId ?: string | null,
	password ?: string | null,
	type ?: string | null,
	appName ?: string,
	host ?: string
}

export interface XAPIAccount {
	accountId ?: string | null,
	password ?: string | null,
	type ?: string | null,
	appName ?: string,
	host ?: string,
	session: string
}

export class XAPI extends Listener {

	public Stream: Stream;
	public Socket: Socket;
	private _tryReconnect: boolean = false;
	public get tryReconnect() { return this._tryReconnect; }
	private pingTimer: any = null;
	private _transactionIdIncrement: number = 0;

	constructor({
		accountId = null,
		password = null,
		type = null,
		appName = undefined,
		host = 'ws.xapi.pro'}: XAPILogin) {
		super();

		this.Socket = new Socket(this);
		this.Stream = new Stream(this);
		if (accountId != null && password != null && type != null) {
			this.setAccount(accountId, password, type, appName, host);
		}

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
		password: "",
		session: "",
		host: "",
		appName: undefined
	};

	public getAccountType(): string {
		return this.account.type;
	}

	public getAccountID(): string {
		return this.account.accountId;
	}

	public getPassword(): string {
		return this.account.password;
	}

	public getSession(): string {
		return this.account.session;
	}

	public getAppName(): string {
		return this.account.appName;
	}

	public getHostname(): string {
		return this.account.host;
	}

	protected setAccount(
		accountId: string,
		password: string,
		type: string,
		appName: string = undefined,
		host: string = 'ws.xapi.pro') {
		this.account = {
			type:  (type.toLowerCase() === "real") ? "real" : "demo",
			accountId,
			password,
			session: "",
			appName,
			host
		};
	}

	public setSession(session: string) {
		this.account.session = session;
		if (this.Stream.status === true && session !== null && session.length > 0) {
			this.callListener("xapiReady");
		}
	}

	public connect() {
		this.Stream.connect();
		this.Socket.connect();
		this._tryReconnect = true;
	}

	public disconnect() {
		if (this.Socket.status) {
			this.Socket.logout().then(() => {
				this.Socket.closeConnection();
			}).catch(() => {
				this.Socket.closeConnection();
			});
		} else {
			this.Socket.closeConnection();
		}
		this.Stream.closeConnection();
		this.account.session = '';
		this._tryReconnect = false;
	}

	public onReady(callBack: () => void, key: string = "default") {
		if (this.getSession().length > 0 && this.Socket.status && this.Stream.status) {
			callBack();
		}
		this.addListener("xapiReady", callBack, "xapiReady"+key);
	}

}

export default XAPI;

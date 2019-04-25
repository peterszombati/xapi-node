import Stream from "./Stream/Stream";
import Socket from "./Socket/Socket";
import Utils from "../utils/Utils";
import {Listener} from "../modules/Listener";

export class XAPI extends Listener {

	public Stream: Stream;
	public Socket: Socket;
	private pingTimer: any = null;
	private _transactionIdIncrement: number = 0;

	constructor(
		accountID: string | null = null,
		password: string | null = null,
		type: string | null = null,
		appName: string = undefined) {
		super();

		this.Socket = new Socket(this);
		this.Stream = new Stream(this);
		if (accountID != null && password != null && type != null) {
			this.setAccount(accountID, password, type, appName);
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

	protected account: any = {
		type: "demo",
		accountID: "",
		password: "",
		session: "",
		appName: undefined
	};

	public getAccountType(): string {
		return this.account.type;
	}

	public getAccountID(): string {
		return this.account.accountID;
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

	protected setAccount(accountID: string, password: string, type: string, appName: string = undefined) {
		this.account = {
			type:  (type.toLowerCase() === "real") ? "real" : "demo",
			accountID,
			password,
			session: "",
			appName
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
	}

	public onReady(callBack: () => void, key: string = "default") {
		if (this.getSession().length > 0 && this.Socket.status && this.Stream.status) {
			callBack();
		}
		this.addListener("xapiReady", callBack, "xapiReady"+key);
	}

}

export default XAPI;

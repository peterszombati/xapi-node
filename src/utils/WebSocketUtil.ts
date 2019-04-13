import {Listener} from "./Listener";

export class WebSocketUtil extends Listener {
	private ws: any = null;
	constructor(url: string) {
		super();
		if (module !== undefined && module.exports) {
			// backend module
			const WebSocketModule = require("ws");
			this.ws = new WebSocketModule(url);
			this.ws.on('open', () => {
				this.callListener("open");
			});
			this.ws.on('close', () => {
				this.callListener("close");
			});
			this.ws.on('message', (message: any) => {
				this.callListener("message", [message]);
			});
			this.ws.on('error', (error: any) => {
				this.callListener("error", [error]);
			});
		} else {
			// frontend module
			this.ws = new WebSocket(url);
			this.ws.onopen = () => {
				this.callListener("open");
			};
			this.ws.onclose = () => {
				this.callListener("close");
			};
			this.ws.onmessage = (event: any) => {
				this.callListener("message", [event.data]);
			};
			this.ws.onerror = (error: any) => {
				this.callListener("error", [error]);
			};
		}
	}

	onOpen(callback: () => void) {
		this.addListener("open", callback);
	}
	onMessage(callback: (message: any) => void) {
		this.addListener("message", callback);
	}

	onError(callback: (error: any) => void) {
		this.addListener("error", callback);
	}

	onClose(callback: () => void) {
		this.addListener("close", callback);
	}

	send(data: any) {
		this.ws.send(data);
	}

	close() {
		this.ws.close();
	}

}

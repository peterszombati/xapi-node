export class Timer {
    private interval: any = null;
    private timeout: any = null;
    setInterval(callback: () => void, ms: number) {
        this.clear();
        this.interval = setInterval(() => {
            this.interval = null;
            callback();
        }, ms);
    }
    setTimeout(callback: () => void, ms: number) {
        this.clear();
        this.timeout = setTimeout(() => {
            this.timeout = null;
            callback();
        }, ms);
    }
    clear() {
        if (this.timeout !== null) {
            clearTimeout(this.timeout);
        }
        if (this.interval !== null) {
            clearInterval(this.interval);
        }
    }
}
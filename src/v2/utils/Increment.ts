export class Increment {
    private _id: number = -1
    public get id() {
        this._id += 1
        if (this._id > 1000) {
            return this._id = 1
        }
        return this._id
    }
}
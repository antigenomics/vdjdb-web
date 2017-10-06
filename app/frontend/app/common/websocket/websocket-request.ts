export interface IWebSocketRequestData {
    [index: string]: any;
}

export class WebSocketRequestData {
    private _data: IWebSocketRequestData = {};

    public add(key: string, data: any): WebSocketRequestData {
        this._data[key] = data;
        return this;
    }

    public unpack(): IWebSocketRequestData {
        return this._data;
    }
}

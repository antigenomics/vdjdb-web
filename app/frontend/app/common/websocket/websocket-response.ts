export interface IWebSocketResponseData {
    [index: string]: any;
}

export class WebSocketResponseData {
    private _data: IWebSocketResponseData;

    constructor(data: any) {
        this._data = data;
    }

    public get(key: string): any {
        return this._data[key];
    }
}

/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

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

    public status(): string {
        /*tslint:disable:no-string-literal */
        return this._data['status'];
        /*tslint:enable:no-string-literal */
    }

    public isSuccess(): boolean {
        return this.status() === 'success';
    }

    public isWarning(): boolean {
        return this.status() === 'warning';
    }

    public isError(): boolean {
        return this.status() === 'error';
    }
}

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

export type NotificationItemType = string;

export namespace NotificationItemType {
    export const INFO: string = 'info';
    export const WARN: string = 'warn';
    export const ERROR: string = 'error';
}

export class NotificationItem {
    public type: NotificationItemType;
    public title: string;
    public content: string;
    public visible: number;

    constructor(type: NotificationItemType, title: string, content: string) {
        this.type = type;
        this.title = title;
        this.content = content;
        this.visible = 1;
    }

    public isInfo(): boolean {
        return this.type === NotificationItemType.INFO;
    }

    public isWarn(): boolean {
        return this.type === NotificationItemType.WARN;
    }

    public isError(): boolean {
        return this.type === NotificationItemType.ERROR;
    }
}

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

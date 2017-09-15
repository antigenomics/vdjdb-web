export const enum NotificationItemType {
    Info  = 'info',
    Warn  = 'warn',
    Error = 'error'
}

export class NotificationItem {
    public type: NotificationItemType;
    public title: string;
    public content: string;

    constructor(type: NotificationItemType, title: string, content: string) {
        this.type = type;
        this.title = title;
        this.content = content;
    }

    public isInfo(): boolean {
        return this.type === NotificationItemType.Info;
    }

    public isWarn(): boolean {
        return this.type === NotificationItemType.Warn;
    }

    public isError(): boolean {
        return this.type === NotificationItemType.Error;
    }
}

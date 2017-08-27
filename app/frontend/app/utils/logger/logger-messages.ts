import { isUndefined } from "util";


export const enum LoggerMessageType {
    Info,
    Warning,
    Error
}

export class LoggerMessage {
    private _content: any;
    private _type: LoggerMessageType = LoggerMessageType.Info;
    private _title: string = '';
    private _notification: boolean = false;
    private _debug: boolean = false;

    constructor(content: any, type?: LoggerMessageType, title?: string, notification?: boolean, debug?: boolean) {
        this._content = content;
        if (!isUndefined(type)) {
            this._type = type;
        }
        if (!isUndefined(title)) {
            this._title = title;
        }
        if (!isUndefined(notification)) {
            this._notification = notification;
        }
        if (!isUndefined(debug)) {
            this._debug = debug;
        }
    }

    get content(): any {
        return this._content;
    }

    get type(): LoggerMessageType {
        return this._type;
    }

    get title(): string {
        return this._title;
    }

    get notification(): boolean {
        return this._notification;
    }

    get debug(): boolean {
        return this._debug;
    }
}

/**  Alias classes for info message **/
export class LoggerInfoMessage extends LoggerMessage {
    constructor(content: any, title?: string, notification?: boolean, debug?: boolean) {
        super(content, LoggerMessageType.Info, title, notification, debug);
    }
}

export class LoggerInfoDebugMessage extends LoggerInfoMessage {
    constructor(content: any, title?: string, notification?: boolean) {
        super(content, title, notification, true);
    }
}

export class LoggerInfoNotificationMessage extends LoggerInfoMessage {
    constructor(content: any, title?: string, debug?: boolean) {
        super(content, title, true, debug);
    }
}

/**  Alias classes for warning message **/
export class LoggerWarningMessage extends LoggerMessage {
    constructor(content: any, title?: string, notification?: boolean, debug?: boolean) {
        super(content, LoggerMessageType.Warning, title, notification, debug);
    }
}

export class LoggerWarningDebugMessage extends LoggerWarningMessage {
    constructor(content: any, title?: string, notification?: boolean) {
        super(content, title, notification, true);
    }
}

export class LoggerWarningNotificationMessage extends LoggerWarningMessage {
    constructor(content: any, title?: string, debug?: boolean) {
        super(content, title, true, debug);
    }
}

/**  Alias classes for error message **/
export class LoggerErrorMessage extends LoggerMessage {
    constructor(content: any, title?: string, notification?: boolean, debug?: boolean) {
        super(content, LoggerMessageType.Error, title, notification, debug);
    }
}

export class LoggerErrorDebugMessage extends LoggerErrorMessage {
    constructor(content: any, title?: string, notification?: boolean) {
        super(content, title, notification, true);
    }
}

export class LoggerErrorNotificationMessage extends LoggerErrorMessage {
    constructor(content: any, title?: string, debug?: boolean) {
        super(content, title, true, debug);
    }
}
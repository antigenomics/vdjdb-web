export const enum LoggerMessageType {
    Info,
    Warning,
    Error
}

export class LoggerMessage {
    type: LoggerMessageType = LoggerMessageType.Info;
    title: string = '';
    content: any;

    constructor(content: any, title?: string, type?: LoggerMessageType) {
        this.content = content;
        if (title) this.title = title;
        if (type) this.type = type;
    }
}

export class LoggerInfoMessage extends LoggerMessage {
    constructor(content: any, title?: string) {
        super(content, title, LoggerMessageType.Info);
    }
}

export class LoggerWarningMessage extends LoggerMessage {
    constructor(content: any, title?: string) {
        super(content, title, LoggerMessageType.Warning);
    }
}

export class LoggerErrorMessage extends LoggerMessage {
    constructor(content: any, title?: string) {
        super(content, title, LoggerMessageType.Error);
    }
}
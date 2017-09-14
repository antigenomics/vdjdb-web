import { Injectable } from '@angular/core';
import { LoggerMessage, LoggerMessageType } from "./logger-messages";
import { ConfigurationService } from "../../configuration.service";


@Injectable()
export class LoggerService {

    constructor(private configuration: ConfigurationService) {}

    // noinspection JSMethodCanBeStatic
    log(message: LoggerMessage) {
        switch (message.type) {
            case LoggerMessageType.Info:
                console.log(message.title, message.content);
                break;
            case LoggerMessageType.Warning:
                console.warn(message.title, message.content);
                break;
            case LoggerMessageType.Error:
                console.error(message.title, message.content);
                break;
        }
    }

    debug(message: LoggerMessage) {
        if (this.configuration.isDevelopmentMode()) {
            message.title = 'Debug: ' + message.title;
            this.log(message);
        }
    }

}
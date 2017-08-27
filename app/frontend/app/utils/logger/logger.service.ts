import { Injectable } from '@angular/core';
import { Configuration } from "../../main";
import { NotificationService } from "../notification/notification.service";
import { LoggerMessage, LoggerMessageType } from "./logger-messages";


@Injectable()
export class LoggerService {

    constructor(private notificationService: NotificationService) {
    }

    log(message: LoggerMessage) {
        if (message.debug && Configuration.isProdMode()) {
            return;
        }
        switch (message.type) {
            case LoggerMessageType.Info:
                console.log(message.content);
                break;
            case LoggerMessageType.Warning:
                console.warn(message.content);
                break;
            case LoggerMessageType.Error:
                console.error(message.content);
                break;
        }
        if (message.notification) {
            this.notificationService.notify(message);
        }
    }

}
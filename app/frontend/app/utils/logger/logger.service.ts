import { Injectable } from '@angular/core';
import { ConfigurationService } from "../../configuration.service";
import { NotificationService } from "../notification/notification.service";


@Injectable()
export class LoggerService {

    constructor(private configuration: ConfigurationService, private notifications: NotificationService) {}

    // noinspection JSMethodCanBeStatic
    info(title: any, content?: any, notify?: boolean) {
        console.log(title, content);
        if (notify) this.notifications.info(title, content);
    }

    // noinspection JSMethodCanBeStatic
    warn(title: any, content?: any, notify?: boolean) {
        console.warn(title, content);
        if (notify) this.notifications.warn(title, content);
    }

    // noinspection JSMethodCanBeStatic
    error(title: any, content?: any, notify?: boolean) {
        console.error(title, content);
        if (notify) this.notifications.error(title, content);
    }

    debug(title: any, content?: any) {
        if (this.configuration.isDevelopmentMode()) {
            this.info('Debug: ' + title, content)
        }
    }

}
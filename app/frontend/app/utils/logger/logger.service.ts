/* tslint:disable:no-console */
import { Injectable } from '@angular/core';
import { ConfigurationService } from '../../configuration.service';

@Injectable()
export class LoggerService {

    // noinspection JSMethodCanBeStatic
    public info(title: any, content?: any) {
        console.log(title, content);
    }

    // noinspection JSMethodCanBeStatic
    public warn(title: any, content?: any) {
        console.warn(title, content);
    }

    // noinspection JSMethodCanBeStatic
    public error(title: any, content?: any) {
        console.error(title, content);
    }

    public debug(title: any, content?: any) {
        if (ConfigurationService.isDevelopmentMode()) {
            this.info('Debug: ' + title, content);
        }
    }
}
/* tslint:enable:no-console */

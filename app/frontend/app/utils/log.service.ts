import { Injectable } from '@angular/core';
import { Configuration } from "../main";

@Injectable()
export class LoggerService {

    log(message: any) {
        console.log(message);
    }

    info(message: any) {
        console.info(message)
    }

    error(message: any) {
        console.error(message);
    }

    devLog(message: any) {
       if (Configuration.isDevMode()) {
           this.log(message);
       }
    }

    devInfo(message: any) {
        if (Configuration.isDevMode()) {
            this.info(message);
        }
    }

    devError(message: any) {
        if (Configuration.isDevMode()) {
            this.error(message);
        }
    }

}
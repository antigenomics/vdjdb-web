import { Injectable } from '@angular/core';

@Injectable()
export class NotificationService {

    // noinspection JSMethodCanBeStatic
    public info(_: any, __?: any): void {
        console.log('Notification', 'Not implemented yet');
    }

    // noinspection JSMethodCanBeStatic
    public warn(_: any, __?: any): void {
        console.log('Notification', 'Not implemented yet');
    }

    // noinspection JSMethodCanBeStatic
    public error(_: any, __?: any): void {
        console.log('Notification', 'Not implemented yet');
    }

}

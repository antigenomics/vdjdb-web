import { EventEmitter, Injectable } from '@angular/core';
import { Utils } from '../utils';
import { NotificationItem, NotificationItemType } from './item/notification-item';

export const enum NotificationServiceEventType {
    Add,
    Delete
}

@Injectable()
export class NotificationService {
    private static _notificationDeleteTimeout: number = 5000;
    private _notifications: NotificationItem[] = [];
    private _notificationEvents: EventEmitter<NotificationServiceEventType> = new EventEmitter(true);

    // noinspection JSMethodCanBeStatic
    public info(title: string, content?: string): void {
        this.addNotification(NotificationItemType.Info, title, content);
    }

    // noinspection JSMethodCanBeStatic
    public warn(title: string, content?: string): void {
        this.addNotification(NotificationItemType.Warn, title, content);
    }

    // noinspection JSMethodCanBeStatic
    public error(title: string, content?: string): void {
        this.addNotification(NotificationItemType.Error, title, content);
    }

    public getNotifications(): NotificationItem[] {
        return this._notifications;
    }

    public getEvents(): EventEmitter<NotificationServiceEventType> {
        return this._notificationEvents;
    }

    private addNotification(type: NotificationItemType, title: string, content?: string): void {
        const item: NotificationItem = new NotificationItem(type, title, content);
        this._notifications.push(item);
        this._notificationEvents.emit(NotificationServiceEventType.Add);
        window.setTimeout(() => {
            Utils.Array.deleteElement(this._notifications, item);
            this._notificationEvents.emit(NotificationServiceEventType.Delete);
        }, NotificationService._notificationDeleteTimeout);
    }
}

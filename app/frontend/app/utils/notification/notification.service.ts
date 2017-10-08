import { EventEmitter, Injectable } from '@angular/core';
import { Utils } from '../utils';
import { NotificationItem, NotificationItemType } from './notification-item';

export type NotificationServiceEventType = number;

export namespace NotificationServiceEventType {
    export const ADD: number = 0;
    export const DELETE_FADE_OUT: number = 1;
    export const DELETE: number = 2;
}

@Injectable()
export class NotificationService {
    private static _notificationDeleteTimeout: number = 5000;
    private static _notificationFadeOutTimeout: number = 1500;
    private _notifications: NotificationItem[] = [];
    private _notificationEvents: EventEmitter<NotificationServiceEventType> = new EventEmitter(true);

    // noinspection JSMethodCanBeStatic
    public info(title: string, content?: string): void {
        this.addNotification(NotificationItemType.INFO, title, content);
    }

    // noinspection JSMethodCanBeStatic
    public warn(title: string, content?: string): void {
        this.addNotification(NotificationItemType.WARN, title, content);
    }

    // noinspection JSMethodCanBeStatic
    public error(title: string, content?: string): void {
        this.addNotification(NotificationItemType.ERROR, title, content);
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
        this._notificationEvents.emit(NotificationServiceEventType.ADD);
        window.setTimeout(() => {
            item.visible = 0;
            this._notificationEvents.emit(NotificationServiceEventType.DELETE_FADE_OUT);
            window.setTimeout(() => {
                Utils.Array.deleteElement(this._notifications, item);
                this._notificationEvents.emit(NotificationServiceEventType.DELETE);
            }, NotificationService._notificationFadeOutTimeout);
        }, NotificationService._notificationDeleteTimeout);
    }
}

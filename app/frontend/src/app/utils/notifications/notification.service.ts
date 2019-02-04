/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

import { EventEmitter, Injectable } from '@angular/core';
import { Utils } from '../utils';
import { NotificationItem, NotificationItemType } from './item/notification-item';

export type NotificationServiceEventType = number;

export namespace NotificationServiceEventType {
  export const ADD: number = 0;
  export const DELETE: number = 1;
}

@Injectable()
export class NotificationService {
  private _notifications: NotificationItem[] = [];
  private _notificationEvents: EventEmitter<NotificationServiceEventType> = new EventEmitter(true);

  public isNotificationsExist(): boolean {
    return this._notifications.length !== 0;
  }

  // noinspection JSMethodCanBeStatic
  public info(title: string, content?: string, timeout?: number): void {
    this.addNotification(NotificationItemType.INFO, title, content, timeout);
  }

  // noinspection JSMethodCanBeStatic
  public success(title: string, content?: string, timeout?: number): void {
    this.addNotification(NotificationItemType.SUCCESS, title, content, timeout);
  }

  // noinspection JSMethodCanBeStatic
  public warn(title: string, content?: string, timeout?: number): void {
    this.addNotification(NotificationItemType.WARNING, title, content, timeout);
  }

  // noinspection JSMethodCanBeStatic
  public error(title: string, content?: string, timeout?: number): void {
    this.addNotification(NotificationItemType.ERROR, title, content, timeout);
  }

  public getNotifications(): NotificationItem[] {
    return this._notifications;
  }

  public getEvents(): EventEmitter<NotificationServiceEventType> {
    return this._notificationEvents;
  }

  public deleteNotification(item: NotificationItem): void {
    Utils.Array.deleteElement(this._notifications, item);
    this._notificationEvents.emit(NotificationServiceEventType.DELETE);
  }

  private addNotification(type: NotificationItemType, title: string, content?: string, timeout?: number): void {
    const item: NotificationItem = new NotificationItem(type, title, content, timeout);
    this._notifications.push(item);
    this._notificationEvents.emit(NotificationServiceEventType.ADD);
  }
}

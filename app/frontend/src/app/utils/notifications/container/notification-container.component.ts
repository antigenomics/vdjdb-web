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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { NotificationItem } from '../item/notification-item';
import { NotificationService } from '../notification.service';

@Component({
    selector:        'notification-container',
    templateUrl:     './notification-container.component.html',
    styleUrls:       [ './notification-container.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationContainerComponent implements OnInit, OnDestroy {
    private _notificationServiceEventsSubscription: Subscription;

    constructor(private notificationService: NotificationService, private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this._notificationServiceEventsSubscription = this.notificationService.getEvents().subscribe(() => {
            this.changeDetector.detectChanges();
        });
    }

    public getNotifications(): NotificationItem[] {
        return this.notificationService.getNotifications();
    }

    public isNotificationsExist(): boolean {
        return this.notificationService.isNotificationsExist();
    }

    public ngOnDestroy(): void {
        if (this._notificationServiceEventsSubscription) {
            this._notificationServiceEventsSubscription.unsubscribe();
        }
    }
}

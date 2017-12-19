/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, Input, Renderer2, ViewChild } from '@angular/core';
import { NotificationService } from '../notification.service';
import { NotificationItem, NotificationItemType } from './notification-item';

@Component({
    selector:        'notification-item',
    templateUrl:     './notification-item.component.html',
    styleUrls:       [ './notification-item.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationItemComponent implements AfterViewInit {
    private static _initialDelay: number = 50;
    private static _defaultHideTimeout: number = 5000;
    private static _hideCSSAnimationDuration: number = 600;
    private _hideTimeoutID: number;

    @Input('item')
    public item: NotificationItem;

    @ViewChild('container')
    public container: ElementRef;

    constructor(private notificationService: NotificationService, private renderer: Renderer2) {}

    public ngAfterViewInit(): void {
        this.show();
    }

    public getIconType(): string {
        switch (this.item.type) {
            case NotificationItemType.INFO:
                return 'info';
            case NotificationItemType.SUCCESS:
                return 'checkmark box';
            case NotificationItemType.WARNING:
                return 'warning sign';
            case NotificationItemType.ERROR:
                return 'remove';
            default:
                return '';
        }
    }

    public hide(): void {
        window.clearTimeout(this._hideTimeoutID);
        this.renderer.removeClass(this.container.nativeElement, 'shown');
        window.setTimeout(() => {
            this.notificationService.deleteNotification(this.item);
        }, NotificationItemComponent._hideCSSAnimationDuration);
    }

    public show(): void {
        window.setTimeout(() => {
            this.renderer.addClass(this.container.nativeElement, 'shown');
            this._hideTimeoutID = window.setTimeout(() => {
                this.hide();
            }, this.item.timeout ? this.item.timeout : NotificationItemComponent._defaultHideTimeout);
        }, NotificationItemComponent._initialDelay);
    }
}

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NotificationItem } from './notification-item';

@Component({
    selector: '[notification-item]',
    templateUrl: 'notification-item.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationItemComponent {
    @Input('notification-item')
    public notificationItem: NotificationItem;
}

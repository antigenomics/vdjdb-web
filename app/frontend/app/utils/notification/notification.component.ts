import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { NotificationService } from './notification.service';

@Component({
    selector:        'notification',
    templateUrl:     './notification.component.html',
    styleUrls:       [ './notification.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NotificationComponent implements OnDestroy {
    private events: Subscription;

    constructor(public notificationService: NotificationService, private changeDetector: ChangeDetectorRef) {
        this.events = this.notificationService.getEvents()
                          .subscribe(() => {
                              this.changeDetector.detectChanges();
                          });
    }

    public ngOnDestroy() {
        this.events.unsubscribe();
    }
}

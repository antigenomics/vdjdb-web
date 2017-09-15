import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NotificationItemComponent } from './item/notification-item.component';
import { NotificationComponent } from './notification.component';
import { NotificationService } from './notification.service';

@NgModule({
    imports:      [ BrowserModule ],
    declarations: [ NotificationComponent, NotificationItemComponent ],
    exports:      [ NotificationComponent, NotificationItemComponent ],
    providers:    [ NotificationService ]
})
export class NotificationModule {}

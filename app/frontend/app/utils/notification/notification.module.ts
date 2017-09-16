import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { NotificationComponent } from './notification.component';
import { NotificationService } from './notification.service';

@NgModule({
    imports:      [ BrowserModule ],
    declarations: [ NotificationComponent ],
    exports:      [ NotificationComponent ],
    providers:    [ NotificationService ]
})
export class NotificationModule {}

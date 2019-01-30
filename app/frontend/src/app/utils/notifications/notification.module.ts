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

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NotificationContainerComponent } from './container/notification-container.component';
import { NotificationItemComponent } from './item/notification-item.component';
import { NotificationService } from './notification.service';

@NgModule({
    imports:      [ CommonModule ],
    declarations: [ NotificationContainerComponent, NotificationItemComponent ],
    exports:      [ NotificationContainerComponent, NotificationItemComponent ],
    providers:    [ NotificationService ]
})
export class NotificationModule {}

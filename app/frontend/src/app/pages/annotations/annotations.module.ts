/*
 *
 *       Copyright 2017 Bagaev Dmitry
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { WebSocketService } from '../../shared/websocket/websocket.service';
import { AnnotationsPageComponent } from './annotations.component';
import { AnnotationsService } from './annotations.service';
import { AnnotationsInfoComponent } from './info/annotations-info.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { AnnotationsUploadComponent } from './upload/upload.component';
import { UploadModule } from './upload/upload.module';
import { ModalsModule } from '../../shared/modals/modals.module';
import { NotificationModule } from '../../utils/notification/notification.module';

const routes = [
    {
        path:     'annotations', component: AnnotationsPageComponent,
        children: [
            { path: 'info', component: AnnotationsInfoComponent },
            { path: 'upload', component: AnnotationsUploadComponent }
        ]
    }
];

@NgModule({
    imports:      [ BrowserModule, UploadModule, RouterModule.forChild(routes), ModalsModule, NotificationModule ],
    declarations: [ AnnotationsPageComponent, SidebarComponent, AnnotationsInfoComponent ],
    exports:      [ AnnotationsPageComponent ],
    providers:    [ AnnotationsService ]
})
export class AnnotationsPageModule {}

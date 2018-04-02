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

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { AnnotationsRouting } from 'pages/annotations/annotations.routing';
import { ModalsModule } from 'shared/modals/modals.module';
import { AnnotationsPageComponent } from './annotations.component';
import { AnnotationsService } from './annotations.service';
import { AnnotationsInfoComponent } from './info/annotations-info.component';
import { SampleItemResolver } from './resolvers/sample.resolver';
import { UserResolver } from './resolvers/user.resolver';
import { SampleModule } from './sample/sample.module';
import { AnnotationsSidebarComponent } from './sidebar/sidebar.component';

@NgModule({
    imports:      [ CommonModule, ModalsModule, SampleModule, AnnotationsRouting ],
    declarations: [ AnnotationsPageComponent, AnnotationsSidebarComponent, AnnotationsInfoComponent ],
    exports:      [ AnnotationsPageComponent ],
    providers:    [ AnnotationsService, UserResolver, SampleItemResolver ]
})
export class AnnotationsPageModule {}

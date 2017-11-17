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
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { UploadComponent } from './upload.component';
import { UploadTableComponent } from './table/upload-table.component';
import { UploadService } from './upload.service';
import { UploadTableRowComponent } from './table/row/upload-table-row.component';
import { ModalsModule } from '../../../common/modals/modals.module';

@NgModule({
    imports:      [ BrowserModule, FormsModule, ModalsModule ],
    declarations: [ UploadComponent, UploadTableComponent, UploadTableRowComponent ],
    providers:    [ UploadService ]
})
export class UploadModule {}
/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

import { ITableClassesSettings, TableClassesSettings } from './table-classes-settings';
import { ITableSizeSettings, TableSizeSettings } from './table-size-settings';
import { ITableUtilsSettings, TableUtilsSettings } from './table-utils-settings';

export interface ITableSettings {
    readonly size?: ITableSizeSettings;
    readonly classes?: ITableClassesSettings;
    readonly utils?: ITableUtilsSettings;
}

export class TableSettings {
    public readonly size: TableSizeSettings = new TableSizeSettings({});
    public readonly classes: TableClassesSettings = new TableClassesSettings({});
    public readonly utils: TableUtilsSettings = new TableUtilsSettings({});

    constructor(settings: ITableSettings) {
        if (settings.size !== undefined) {
            this.size = new TableSizeSettings(settings.size);
        }
        if (settings.classes !== undefined) {
            this.classes = new TableClassesSettings(settings.classes);
        }
        if (settings.utils !== undefined) {
            this.utils = new TableUtilsSettings(settings.utils);
        }
    }
}

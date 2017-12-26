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

import { FontSizeSettings, IFontSizeConfiguration } from './table-size-font-settings';

export interface ITableSizeSettings {
    readonly header?: IFontSizeConfiguration;
    readonly content?: IFontSizeConfiguration;
}

export class TableSizeSettings {
    public readonly header: FontSizeSettings = new FontSizeSettings({});
    public readonly content: FontSizeSettings = new FontSizeSettings({});

    constructor(sizeSettings: ITableSizeSettings) {
        if (sizeSettings.header !== undefined) {
            this.header = new FontSizeSettings(sizeSettings.header);
        }
        if (sizeSettings.content !== undefined) {
            this.content = new FontSizeSettings(sizeSettings.content);
        }
    }
}

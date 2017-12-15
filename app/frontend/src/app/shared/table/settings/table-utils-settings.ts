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

export interface ITableUtilsSettings {
    readonly disable?: boolean;
    readonly pagination?: boolean;
    readonly info?: boolean;
    readonly export?: boolean;
    readonly pageSize?: boolean;
}

export class TableUtilsSettings {
    public readonly disable: boolean = false;
    public readonly pagination: boolean = true;
    public readonly info: boolean = true;
    public readonly export: boolean = true;
    public readonly pageSize: boolean = true;

    constructor(utilsSettings: ITableUtilsSettings) {
        if (utilsSettings.disable !== undefined) {
            this.disable = utilsSettings.disable;
        }
        if (utilsSettings.pagination !== undefined) {
            this.pagination = utilsSettings.pagination;
        }
        if (utilsSettings.info !== undefined) {
            this.info = utilsSettings.info;
        }
        if (utilsSettings.export !== undefined) {
            this.export = utilsSettings.export;
        }
        if (utilsSettings.pageSize !== undefined) {
            this.pageSize = utilsSettings.pageSize;
        }
    }
}
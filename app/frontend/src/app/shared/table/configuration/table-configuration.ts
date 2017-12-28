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

/* Table classes configuration options
 * =================================== */
import { ExportFormat, ExportOptionFlag } from 'shared/table/export/table-export.component';

export interface ITableClassesConfigurationDescriptor {
    readonly columns?: string;
    readonly rows?: string;
}

function createDefaultTableClassesConfiguration(): ITableClassesConfigurationDescriptor {
    return {
        columns: '',
        rows:    ''
    };
}

/* Table utils configuration options
 * =================================== */
export interface ITableUtilsPaginationConfigurationDescriptor {
    readonly disable?: boolean;
    readonly pageRange?: number;
}

export interface ITableUtilsExportConfigurationDescriptor {
    readonly disable?: boolean;
    readonly formats?: ExportFormat[];
    readonly options?: ExportOptionFlag[];
}

export interface ITableUtilsPageSizeConfigurationDescriptor {
    readonly disable?: boolean;
    readonly sizes?: number[];
}

export interface ITableUtilsConfigurationDescriptor {
    readonly disable?: boolean;
    readonly pagination?: ITableUtilsPaginationConfigurationDescriptor;
    readonly info?: boolean;
    readonly export?: ITableUtilsExportConfigurationDescriptor;
    readonly pageSize?: ITableUtilsPageSizeConfigurationDescriptor;
}

function ITableUtilsConfigurationDefault(): ITableUtilsConfigurationDescriptor {
    return {
        disable:    false,
        pagination: { disable: false, pageRange: 5 },
        info:       true,
        export:     { disable: false, formats: [], options: [] },
        pageSize:   { disable: false, sizes: [ 25, 50, 100 ] }
    };
}

/* Table font size configuration options
 * ====================================== */
export interface IFontSizeConfigurationDescriptor {
    readonly dynamicSizeEnabled?: boolean;
    readonly dynamicSizeWeightA?: number;
    readonly dynamicSizeWeightB?: number;
}

export interface ITableSizeConfigurationDescriptor {
    readonly header?: IFontSizeConfigurationDescriptor;
    readonly content?: IFontSizeConfigurationDescriptor;
}

function createDefaultTableSizeConfiguration(): ITableSizeConfigurationDescriptor {
    return {
        header:  { dynamicSizeEnabled: false, dynamicSizeWeightA: 0.0003125, dynamicSizeWeightB: 0.4 },
        content: { dynamicSizeEnabled: false, dynamicSizeWeightA: 0.0003125, dynamicSizeWeightB: 0.4 }
    };
}

/* Table configuration options
 * =================================== */
export interface ITableConfigurationDescriptor {
    readonly classes?: ITableClassesConfigurationDescriptor;
    readonly utils?: ITableUtilsConfigurationDescriptor;
    readonly size?: ITableSizeConfigurationDescriptor;
}

export function createDefaultTableConfiguration(): ITableConfigurationDescriptor {
    return {
        classes: createDefaultTableClassesConfiguration(),
        utils:   ITableUtilsConfigurationDefault(),
        size:    createDefaultTableSizeConfiguration()
    };
}
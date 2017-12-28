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
export interface ITableClassesConfigurationDescriptor {
    readonly columns?: string;
    readonly rows?: string;
}

export function ITableClassesConfigurationDefault(): ITableClassesConfigurationDescriptor {
    return {
        columns: '',
        rows:    ''
    };
}

/* Table utils configuration options
 * =================================== */
export interface ITableUtilsConfigurationDescriptor {
    readonly disable?: boolean;
    readonly pagination?: boolean;
    readonly info?: boolean;
    readonly export?: boolean;
    readonly pageSize?: boolean;
}

export function ITableUtilsConfigurationDefault(): ITableUtilsConfigurationDescriptor {
    return {
        disable:    false,
        pagination: true,
        info:       true,
        export:     true,
        pageSize:   true
    };
}

/* Table font size configuration options
 * ====================================== */
export interface IFontSizeConfigurationDescriptor {
    readonly dynamicSizeEnabled?: boolean;
    readonly dynamicSizeWeightA?: number;
    readonly dynamicSizeWeightB?: number;
}

export function IFontSizeConfigurationDefault(): IFontSizeConfigurationDescriptor {
    return {
        dynamicSizeEnabled: false,
        dynamicSizeWeightA: 0.0003125,
        dynamicSizeWeightB: 0.4
    };
}

export interface ITableSizeConfigurationDescriptor {
    readonly header?: IFontSizeConfigurationDescriptor;
    readonly content?: IFontSizeConfigurationDescriptor;
}

export function ITableSizeConfigurationDefault(): ITableSizeConfigurationDescriptor {
    return {
        header:  IFontSizeConfigurationDefault(),
        content: IFontSizeConfigurationDefault()
    };
}

/* Table configuration options
 * =================================== */
export interface ITableConfigurationDescriptor {
    readonly classes?: ITableClassesConfigurationDescriptor;
    readonly utils?: ITableUtilsConfigurationDescriptor;
    readonly size?: ITableSizeConfigurationDescriptor;
}

export function ITableConfigurationDefault(): ITableConfigurationDescriptor {
    return {
        classes: ITableClassesConfigurationDefault(),
        utils:   ITableUtilsConfigurationDefault(),
        size:    ITableSizeConfigurationDefault()
    };
}
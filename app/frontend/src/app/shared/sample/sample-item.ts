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

import { SampleFilters } from 'pages/annotations/sample/filters/sample-filters';
import { IntersectionTable } from 'pages/annotations/sample/table/intersection/intersection-table';

export interface ISampleItemData {
    readonly filters: SampleFilters;
    readonly table: IntersectionTable;
}

export class SampleItem {
    private _data: ISampleItemData;
    private _processingLabel: string = '';
    private _processing: boolean = false;

    public readonly name: string;
    public readonly software: string;

    constructor(name: string, software: string) {
        this.name = name;
        this.software = software;
    }

    public setData(data: ISampleItemData): void {
        this._data = data;
    }

    public hasData(): boolean {
        return this._data !== undefined;
    }

    public getData(): ISampleItemData {
        return this._data;
    }

    public get table(): IntersectionTable {
        return this._data.table;
    }

    public get filters(): SampleFilters {
        return this._data.filters;
    }

    public setProcessingLabel(processingLabel: string): void {
        this._processingLabel = processingLabel;
    }

    public getProcessingLabel(): string {
        return this._processingLabel;
    }

    public setProcessingStatus(processing: boolean): void {
        this._processing = processing;
    }

    public isProcessing(): boolean {
        return this._processing;
    }

    public static deserialize(o: any): SampleItem {
        /* tslint:disable:no-string-literal */
        return new SampleItem(o[ 'name' ], o[ 'software' ]);
        /* tslint:enable:no-string-literal */
    }
}

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

import { SampleItem } from '../../../../shared/sample/sample-item';
import { IntersectionTableRow } from './row/intersection-table-row';

export class IntersectionTable {
    private _error: boolean;
    private _loading: boolean;
    private _initialized: boolean;
    private _sample: SampleItem;
    private _rows: IntersectionTableRow[] = [];

    constructor(sample: SampleItem) {
        this._error = false;
        this._loading = false;
        this._initialized = false;
        this._sample = sample;
    }

    public isError(): boolean {
        return this._error;
    }

    public isLoading(): boolean {
        return this._loading;
    }

    public isInitialized(): boolean {
        return this._initialized;
    }

    public isEmpty(): boolean {
        return this._rows.length === 0;
    }

    public getSample(): SampleItem {
        return this._sample;
    }

    public getRows(): IntersectionTableRow[] {
        return this._rows;
    }

    public loading(): void {
        this._loading = true;
    }

    public update(rows: any[]): void {
        this._rows = rows.map((r) => new IntersectionTableRow(r));
        this._initialized = true;
        this._loading = false;
    }

    public error(): void {
        this._initialized = true;
        this._loading = false;
        this._error = true;
    }
}

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
    private _sample: SampleItem;
    private _rows: IntersectionTableRow[];

    constructor(sample: SampleItem, rows: any[]) {
        this._sample = sample;
        this._rows = rows.map((r) => new IntersectionTableRow(r));
    }

    public getSample(): SampleItem {
        return this._sample;
    }

    public getRows(): IntersectionTableRow[] {
        return this._rows;
    }
}

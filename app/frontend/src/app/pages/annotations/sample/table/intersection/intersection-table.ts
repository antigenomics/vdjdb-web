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

import { IntersectionSummary } from 'pages/annotations/sample/table/intersection/summary/intersection-summary';
import { SampleItem } from 'shared/sample/sample-item';
import { Table } from 'shared/table/table';
import { IntersectionTableRow } from './row/intersection-table-row';

export class IntersectionTable extends Table<IntersectionTableRow> {
    private _loadingLabel: string = 'Loading';
    private _sample: SampleItem;

    private _summary: IntersectionSummary;

    constructor(sample: SampleItem) {
        super();
        this._sample = sample;
    }

    public setLoadingLabel(label: string): void {
        this._loadingLabel = label;
    }

    public getSample(): SampleItem {
        return this._sample;
    }

    public getRows(): IntersectionTableRow[] {
        if (this.page >= 0) {
            let fromIndex = this.pageSize * this.page;
            fromIndex = (fromIndex > this.getRowsCount()) ? this.getRowsCount() : fromIndex;
            let toIndex = this.pageSize * (this.page + 1);
            toIndex = (toIndex > this.getRowsCount()) ? this.getRowsCount() : toIndex;
            return this.rows.slice(fromIndex, toIndex);
        } else {
            this.updatePage(0);
            return this.getRows();
        }
    }

    public getRowsCount(): number {
        return this.rows.length;
    }

    public updateSummary(summary: IntersectionSummary) {
        this._summary = summary;
    }

    public getSummary(): IntersectionSummary {
        return this._summary;
    }

    get loadingLabel(): string {
        return this._loadingLabel;
    }
}

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

import { SummaryFieldCounter } from 'pages/annotations/sample/table/intersection/summary/summary-field-counter';
import { Table } from 'shared/table/table';
import { WebSocketResponseData } from 'shared/websocket/websocket-response';
import { IntersectionTableRow } from './row/intersection-table-row';

export class IntersectionTable extends Table<IntersectionTableRow> {
    private _summary?: SummaryFieldCounter[];

    constructor() {
        super();
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

    public update(response: WebSocketResponseData): void {
        const summary = response.get('summary').map((v: any) => new SummaryFieldCounter(v));
        this.updateSummary(summary);

        let index = 0;
        const rows = response.get('rows').map((r: any) => new IntersectionTableRow(r, index++));
        this.updatePage(0);
        this.updateRecordsFound(rows.length);
        this.updateRows(rows);
    }

    public updateSummary(summary: SummaryFieldCounter[]) {
        this._summary = summary;
    }

    public isSummaryExist(): boolean {
        return this._summary !== undefined;
    }

    public getSummary(): SummaryFieldCounter[] {
        return this._summary;
    }
}

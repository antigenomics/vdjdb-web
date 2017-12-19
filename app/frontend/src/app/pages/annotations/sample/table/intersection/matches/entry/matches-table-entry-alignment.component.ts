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

import { ChangeDetectionStrategy, Component, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import { PopupContentTable } from 'shared/modals/popup/popup-content-table';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { MatchRowAlignment, MatchTableRow } from '../row/match-table-row';

@Component({
    selector:            'td[match-table-entry-alignment]',
    template:            `<span class="text alignment cursor pointer" [popup]="popupAlignmentTable"
                            display="table" position="right" popupClass="big text alignment" width="800">
                            {{ alignment.seq1String }}<br>
                            {{ alignment.markup }}<br>
                            {{ alignment.seq2String }}
                         </span>`,
    changeDetection:     ChangeDetectionStrategy.OnPush,
    preserveWhitespaces: false
})
export class MatchesTableEntryAlignmentComponent extends TableEntry {
    public alignment: MatchRowAlignment;

    public popupAlignmentTable: PopupContentTable;

    public create(entry: string, column: TableColumn, columns: TableColumn[], row: MatchTableRow,
                  hostViewContainer: ViewContainerRef, resolver: ComponentFactoryResolver): void {
        this.alignment = row.alignment;

        const rows = [ [ row.alignment.seq1String ], [ row.alignment.markup ], [ row.alignment.seq2String ] ];
        this.popupAlignmentTable = new PopupContentTable([ 'Alignment' ], rows);
    }
}

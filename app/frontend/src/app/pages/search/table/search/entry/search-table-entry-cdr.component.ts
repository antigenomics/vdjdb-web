/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { ChangeDetectionStrategy, Component, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import { TableColumn } from '../../../../../shared/table/column/table-column';
import { TableEntry } from '../../../../../shared/table/entry/table-entry';
import { Utils } from '../../../../../utils/utils';
import { SearchTableRow } from '../row/search-table-row';
import ColorizedPatternRegion = Utils.SequencePattern.ColorizedPatternRegion;

@Component({
    selector: 'td[search-table-entry-cdr]',
    template: `<span *ngFor="let region of regions" [style.color]="region.color">{{ region.part }}</span>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryCdrComponent extends TableEntry {
    public regions: ColorizedPatternRegion[] = [];

    public create(entry: string, column: TableColumn, columns: TableColumn[], row: SearchTableRow,
                  hostViewContainer: ViewContainerRef, resolver: ComponentFactoryResolver): void {
        this.regions = Utils.SequencePattern.colorizePattern(entry, row.metadata.cdr3vEnd, row.metadata.cdr3jStart);
    }
}

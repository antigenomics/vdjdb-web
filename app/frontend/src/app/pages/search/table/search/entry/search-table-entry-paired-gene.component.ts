/*
 *     Copyright 2017-2019 Bagaev Dmitry
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
 */

import { ChangeDetectionStrategy, Component, ComponentFactoryResolver, ViewContainerRef } from '@angular/core';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { TableRow } from 'shared/table/row/table-row';

// Gene cell for the paired (second-chain) sub-row: a ↳ marker indicating the linked chain,
// followed by the gene name. Colour/background are handled by the `.paired-row` row styling.
@Component({
  selector:        'td[search-table-entry-paired-gene]',
  template:        `<span class="paired-gene-arrow">&#8627;</span>{{ entry }}`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryPairedGeneComponent extends TableEntry {
  public entry: string;

  public create(entry: string, _column: TableColumn, _columns: TableColumn[], _row: TableRow,
                _hostViewContainer: ViewContainerRef, _resolver: ComponentFactoryResolver): void {
    this.entry = entry;
  }
}

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

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { TableColumn } from '../column/table-column';

interface ISelectableColumnDescriptor {
  readonly name: string;
  readonly fallbackTitle: string;
}

@Component({
  selector:        'table-select-columns',
  templateUrl:     './table-select_columns.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableSelectColumnsComponent {
  private static readonly _selectableColumns: ISelectableColumnDescriptor[] = [
    { name: 'mhc.class', fallbackTitle: 'MHC class' },
    { name: 'antigen.species', fallbackTitle: 'Epitope species' },
    { name: 'reference.id', fallbackTitle: 'Reference' }
  ];

  @Input('columns')
  public columns: TableColumn[] = [];

  @Input('hiddenColumns')
  public hiddenColumns: string[] = [];

  @Output('hiddenColumnsChange')
  public hiddenColumnsChange = new EventEmitter<string[]>();

  public getSelectableColumns(): ISelectableColumnDescriptor[] {
    const columns = this.columns || [];
    return TableSelectColumnsComponent._selectableColumns.filter((descriptor) => {
      return columns.some((column) => column.name === descriptor.name);
    });
  }

  public isHidden(columnName: string): boolean {
    const hidden = this.hiddenColumns || [];
    return hidden.indexOf(columnName) !== -1;
  }

  public toggle(columnName: string): void {
    const selectable = this.getSelectableColumns().some((descriptor) => descriptor.name === columnName);
    if (!selectable) {
      return;
    }
    const nextHidden = (this.hiddenColumns || []).slice();
    const idx = nextHidden.indexOf(columnName);
    if (idx === -1) {
      nextHidden.push(columnName);
    } else {
      nextHidden.splice(idx, 1);
    }
    this.hiddenColumns = nextHidden;
    this.hiddenColumnsChange.emit(nextHidden);
  }

  public getColumnTitle(columnName: string): string {
    const columns = this.columns || [];
    const column = columns.find((c) => c.name === columnName);
    if (column !== undefined) {
      return column.title;
    }
    const descriptor = TableSelectColumnsComponent._selectableColumns.find((c) => c.name === columnName);
    return descriptor !== undefined ? descriptor.fallbackTitle : columnName;
  }

  public hasColumns(): boolean {
    return this.getSelectableColumns().length > 0;
  }
}

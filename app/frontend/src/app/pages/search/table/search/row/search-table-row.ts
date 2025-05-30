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

import { ComponentFactory, ComponentFactoryResolver } from '@angular/core';
import { SearchTableEntryMHCComponent } from 'pages/search/table/search/entry/search-table-entry-mhc.component';
import { SearchTableEntrySegmentComponent } from 'pages/search/table/search/entry/search-table-entry-segment.component';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { TableRow } from 'shared/table/row/table-row';
import { SearchTableEntryCdrComponent } from '../entry/search-table-entry-cdr.component';
import { SearchTableEntryGeneComponent } from '../entry/search-table-entry-gene.component';
import { SearchTableEntryMetaComponent } from '../entry/search-table-entry-meta.component';
import { SearchTableEntryUrlComponent } from '../entry/search-table-entry-url.component';

export class SearchTableRowMetadata {
  public readonly pairedID: string;
  public readonly cdr3vEnd: number;
  public readonly cdr3jStart: number;

  constructor(meta: any) {
    /* tslint:disable:no-string-literal */
    this.pairedID = meta[ 'pairedID' ];
    this.cdr3vEnd = meta[ 'cdr3vEnd' ];
    this.cdr3jStart = meta[ 'cdr3jStart' ];
    /* tslint:enable:no-string-literal */
  }
}

export class SearchTableRow extends TableRow {
  private pairedDisabled: boolean = false;

  public readonly entries: string[];
  public readonly metadata: SearchTableRowMetadata;

  constructor(row: any, pairedDisabled: boolean = false) {
    /* tslint:disable:no-string-literal */
    super();
    this.entries = row[ 'entries' ];
    this.metadata = new SearchTableRowMetadata(row[ 'metadata' ]);
    this.pairedDisabled = pairedDisabled;
    /* tslint:enable:no-string-literal */
  }

  public hash(): string {
    return this.entries[ 1 ];
  }

  public getEntries(): string[] {
    return this.entries;
  }

  public resolveComponentFactory(column: TableColumn, resolver: ComponentFactoryResolver): ComponentFactory<TableEntry> {
    if (column.name === 'gene' && !this.pairedDisabled) {
      return resolver.resolveComponentFactory(SearchTableEntryGeneComponent);
    } else if (column.name === 'cdr3') {
      return resolver.resolveComponentFactory(SearchTableEntryCdrComponent);
    } else if (column.name === 'reference.id') {
      return resolver.resolveComponentFactory(SearchTableEntryUrlComponent);
    } else if (column.name === 'method' || column.name === 'meta' || column.name === 'cdr3fix') {
      return resolver.resolveComponentFactory(SearchTableEntryMetaComponent);
    } else if (column.name === 'v.segm' || column.name === 'j.segm') {
      return resolver.resolveComponentFactory(SearchTableEntrySegmentComponent);
    } else if (column.name === 'mhc.a' || column.name === 'mhc.b') {
      return resolver.resolveComponentFactory(SearchTableEntryMHCComponent);
    }
    return undefined;
  }
}

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

import { ComponentFactory, ComponentFactoryResolver } from '@angular/core';
import { SearchTableRow } from 'pages/search/table/search/row/search-table-row';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { MatchesTableEntryAlignmentComponent } from '../entry/matches-table-entry-alignment.component';

export class MatchRowAlignment {
    public readonly seq1String: string;
    public readonly markup: string;
    public readonly seq2String: string;

    constructor(helper: any) {
        /* tslint:disable:no-string-literal */
        this.seq1String = helper[ 'seq1String' ].trim();
        this.markup = helper[ 'markup' ].trim();
        this.seq2String = helper[ 'seq2String' ].trim();
        /* tslint:enable:no-string-literal */
    }
}

export class MatchTableRow extends SearchTableRow {
    public readonly alignment: MatchRowAlignment;

    constructor(match: any) {
        /* tslint:disable:no-string-literal */
        super(match[ 'row' ], true);
        this.alignment = new MatchRowAlignment(match[ 'alignment' ]);
        /* tslint:enable:no-string-literal */
    }

    public resolveComponentFactory(column: TableColumn, resolver: ComponentFactoryResolver): ComponentFactory<TableEntry> {
        if (column.name === 'alignment') {
            return resolver.resolveComponentFactory(MatchesTableEntryAlignmentComponent);
        } else {
            return super.resolveComponentFactory(column, resolver);
        }
    }
}

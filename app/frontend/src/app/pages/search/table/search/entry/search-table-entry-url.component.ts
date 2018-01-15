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
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { TableRow } from 'shared/table/row/table-row';

@Component({
    selector:        'td[search-table-entry-url]',
    template:        '<a [attr.href]="link" target="_blank" rel="noopener">{{ value }}</a>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryUrlComponent extends TableEntry {
    private static prefixPMIDLength: number = 5;

    public value: string;
    public link: string;

    public create(entry: string, _column: TableColumn, _columns: TableColumn[], _row: TableRow,
                  _hostViewContainer: ViewContainerRef, _resolver: ComponentFactoryResolver): void {
        if (entry.indexOf('PMID') >= 0) {
            const id = entry.substring(SearchTableEntryUrlComponent.prefixPMIDLength, entry.length);
            this.link = `http://www.ncbi.nlm.nih.gov/pubmed/?term=${id}`;
            this.value = `PMID:${id}`;
        } else if (entry.indexOf('http') >= 0) {
            let domain;
            // find & remove protocol (http, ftp, etc.) and get domain
            if (entry.indexOf('://') > -1) {
                domain = entry.split('/')[ 2 ];
            } else {
                domain = entry.split('/')[ 0 ];
            }
            // find & remove port number
            this.value = domain.split(':')[ 0 ];
            this.link = entry;
        }
    }
}

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

import { ComponentFactoryResolver, ComponentRef, ViewContainerRef } from '@angular/core';
import { TableColumn } from '../../../../../shared/table/column/table-column';
import { TableRow } from '../../../../../shared/table/row/table-row';
import { SearchTableEntryCdrComponent } from '../entry/search-table-entry-cdr.component';
import { SearchTableEntryGeneComponent } from '../entry/search-table-entry-gene.component';
import { SearchTableEntryJsonComponent } from '../entry/search-table-entry-json.component';
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
    public readonly metadata: SearchTableRowMetadata;

    constructor(row: any) {
        /* tslint:disable:no-string-literal */
        super(row[ 'entries' ]);
        this.metadata = new SearchTableRowMetadata(row[ 'metadata' ]);
        /* tslint:enable:no-string-literal */
    }


    public create(entry: string, column: TableColumn, hostViewContainer: ViewContainerRef,
                  rowViewContainer: ViewContainerRef, resolver: ComponentFactoryResolver): ComponentRef<any> {
        let component;
        switch (column.name) {
            case 'cdr3':
                const cdr3EntryComponentResolver = resolver.resolveComponentFactory(SearchTableEntryCdrComponent);
                component = rowViewContainer.createComponent(cdr3EntryComponentResolver);
                component.instance.create(entry, this.metadata.cdr3vEnd, this.metadata.cdr3jStart);
                break;
            case 'reference.id':
                const urlEntryComponentResolver = resolver.resolveComponentFactory(SearchTableEntryUrlComponent);
                component = rowViewContainer.createComponent(urlEntryComponentResolver);
                component.instance.generate(entry);
                break;
            case 'method':
            case 'meta':
            case 'cdr3fix':
                const jsonEntryComponentResolver = resolver.resolveComponentFactory(SearchTableEntryJsonComponent);
                component = this.rowViewContainer.createComponent(jsonComponentResolver);
                component.instance.generate(column.title, entry, column);
            default:
                break;
        }
        // switch (column.name) {
        //     case 'gene':
        //         // if (this.allowPaired) {
        //         // const rowComponentResolver = resolver.resolveComponentFactory();
        //         // component = rowViewContainer.createComponent(geneComponentResolver);
        //         // component.instance.generate(entry, this.metadata.pairedID, hostViewContainer, rowComponentResolver);
        //         // } else {
        //         //
        //         // }
        //
        //         component = rowViewContainer.createComponent(originalComponentResolver);
        //         component.instance.generate(`${entry}`);
        //         break;
        //     case 'cdr3':
        //         component = this.rowViewContainer.createComponent(cdrComponentResolver);
        //         component.instance.generate(entry, this.row);
        //         break;
        //     case 'reference.id':
        //         component = this.rowViewContainer.createComponent(urlComponentResolver);
        //         component.instance.generate(entry);
        //         break;
        //     case 'method':
        //     case 'meta':
        //     case 'cdr3fix':
        //         component = this.rowViewContainer.createComponent(jsonComponentResolver);
        //         component.instance.generate(column.title, entry, column);
        //         break;
        //     default:
        //         component = this.rowViewContainer.createComponent(originalComponentResolver);
        //         component.instance.generate(entry);
        // }
        return component;
    }
}

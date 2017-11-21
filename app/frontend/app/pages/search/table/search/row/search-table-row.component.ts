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

import {
    ChangeDetectionStrategy, Component, ComponentFactoryResolver, ComponentRef, HostBinding, Input, OnDestroy, OnInit,
    ViewChild, ViewContainerRef
} from '@angular/core';
import { SearchTableEntryCdrComponent } from '../entry/cdr/search-table-entry-cdr.component';
import { SearchTableEntryGeneComponent } from '../entry/gene/search-table-entry-gene.component';
import { SearchTableEntryJsonComponent } from '../entry/json/search-table-entry-json.component';
import { SearchTableEntryOriginalComponent } from '../entry/original/search-table-entry-original.component';
import { SearchTableEntryUrlComponent } from '../entry/url/search-table-entry-url.component';
import { SearchTableService } from '../search-table.service';
import { SearchTableRow } from './search-table-row';
import { BooleanConverter, InputConverter } from "../../../../../utils/input-converter.decorator";

@Component({
    selector:        'tr[search-table-row]',
    template:        '<ng-container #rowViewContainer></ng-container>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableRowComponent implements OnInit, OnDestroy {
    private components: Array<ComponentRef<any>> = [];

    @HostBinding('class.center')
    public centered: boolean = true;

    @HostBinding('class.aligned')
    public aligned: boolean = true;

    @Input('allowPaired')
    @InputConverter(BooleanConverter)
    public allowPaired: boolean = true;

    @Input('search-table-row')
    public row: SearchTableRow;

    @ViewChild('rowViewContainer', { read: ViewContainerRef })
    public rowViewContainer: ViewContainerRef;

    constructor(private hostViewContainer: ViewContainerRef, private resolver: ComponentFactoryResolver,
                private table: SearchTableService) {
    }

    public ngOnInit(): void {
        const cdrComponentResolver = this.resolver.resolveComponentFactory<SearchTableEntryCdrComponent>(SearchTableEntryCdrComponent);
        const urlComponentResolver = this.resolver.resolveComponentFactory<SearchTableEntryUrlComponent>(SearchTableEntryUrlComponent);
        const jsonComponentResolver = this.resolver.resolveComponentFactory<SearchTableEntryJsonComponent>(SearchTableEntryJsonComponent);
        const originalComponentResolver = this.resolver.resolveComponentFactory<SearchTableEntryOriginalComponent>(SearchTableEntryOriginalComponent);
        const geneComponentResolver = this.resolver.resolveComponentFactory<SearchTableEntryGeneComponent>(SearchTableEntryGeneComponent);
        const rowComponentResolver = this.resolver.resolveComponentFactory<SearchTableRowComponent>(SearchTableRowComponent);

        if (this.row.entries) {
            this.row.entries.forEach((entry: string, index: number) => {
                const column = this.table.columns[ index ];
                let component: ComponentRef<any>;
                switch (column.name) {
                    case 'gene':
                        if (this.allowPaired) {
                            component = this.rowViewContainer.createComponent<SearchTableEntryGeneComponent>(geneComponentResolver);
                            component.instance.generate(entry, this.row.metadata.pairedID, this.hostViewContainer, rowComponentResolver);
                        } else {
                            component = this.rowViewContainer.createComponent<SearchTableEntryOriginalComponent>(originalComponentResolver);
                            component.instance.generate(`${entry}`);
                        }
                        break;
                    case 'cdr3':
                        component = this.rowViewContainer.createComponent<SearchTableEntryCdrComponent>(cdrComponentResolver);
                        component.instance.generate(entry, this.row);
                        break;
                    case 'reference.id':
                        component = this.rowViewContainer.createComponent<SearchTableEntryUrlComponent>(urlComponentResolver);
                        component.instance.generate(entry);
                        break;
                    case 'method':
                    case 'meta':
                    case 'cdr3fix':
                        component = this.rowViewContainer.createComponent<SearchTableEntryJsonComponent>(jsonComponentResolver);
                        component.instance.generate(column.title, entry, column);
                        break;
                    default:
                        component = this.rowViewContainer.createComponent<SearchTableEntryOriginalComponent>(originalComponentResolver);
                        component.instance.generate(entry);
                }
                this.components.push(component);
            });
        }
    }

    public ngOnDestroy(): void {
        this.components.forEach((component: ComponentRef<any>) => {
            component.destroy();
        });
    }
}

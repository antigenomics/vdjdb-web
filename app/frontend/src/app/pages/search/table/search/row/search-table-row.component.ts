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
import { IntersectionTableRowAlignment } from '../../../../annotations/sample/table/row/intersection-table-row-alignment';
import { DatabaseColumnInfo } from '../../../database/database-metadata';
import { SearchTableEntryAlignmentComponent } from '../entry/search-table-entry-alignment.component';
import { SearchTableEntryCdrComponent } from '../entry/search-table-entry-cdr.component';
import { SearchTableEntryGeneComponent } from '../entry/search-table-entry-gene.component';
import { SearchTableEntryJsonComponent } from '../entry/search-table-entry-json.component';
import { SearchTableEntryOriginalComponent } from '../entry/search-table-entry-original.component';
import { SearchTableEntryUrlComponent } from '../entry/search-table-entry-url.component';
import { SearchTableRow } from './search-table-row';

@Component({
    selector:        'tr[search-table-row]',
    template:        '<ng-container #rowViewContainer></ng-container>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableRowComponent implements OnInit, OnDestroy {
    private _components: Array<ComponentRef<any>> = [];

    @HostBinding('class.center')
    @HostBinding('class.aligned')
    public centered: boolean = true;

    @Input('allowPaired')
    public allowPaired: boolean = true;

    @Input('search-table-row')
    public row: SearchTableRow;

    @Input('columns')
    public columns: DatabaseColumnInfo[];

    @Input('skip-columns')
    public skip: string[];

    @Input('index')
    public index: number;

    @Input('alignment')
    public alignment: IntersectionTableRowAlignment;

    @ViewChild('rowViewContainer', { read: ViewContainerRef })
    public rowViewContainer: ViewContainerRef;

    constructor(private hostViewContainer: ViewContainerRef, private resolver: ComponentFactoryResolver) {
    }

    public ngOnInit(): void {
        const cdrComponentResolver = this.resolver.resolveComponentFactory(SearchTableEntryCdrComponent);
        const urlComponentResolver = this.resolver.resolveComponentFactory(SearchTableEntryUrlComponent);
        const jsonComponentResolver = this.resolver.resolveComponentFactory(SearchTableEntryJsonComponent);
        const originalComponentResolver = this.resolver.resolveComponentFactory(SearchTableEntryOriginalComponent);
        const geneComponentResolver = this.resolver.resolveComponentFactory(SearchTableEntryGeneComponent);
        const rowComponentResolver = this.resolver.resolveComponentFactory(SearchTableRowComponent);
        const alignmentComponentResolver = this.resolver.resolveComponentFactory(SearchTableEntryAlignmentComponent);

        if (this.row.entries) {
            if (this.index !== undefined) {
                const indexComponent = this.rowViewContainer.createComponent(originalComponentResolver);
                indexComponent.instance.generate(this.index.toString());
                this._components.push(indexComponent);
            }
            if (this.alignment !== undefined) {
                const alignmentComponent = this.rowViewContainer.createComponent(alignmentComponentResolver);
                alignmentComponent.instance.generate(this.alignment);
                this._components.push(alignmentComponent);
            }
            this.row.entries.forEach((entry: string, index: number) => {
                const column = this.columns[ index ];
                let component: ComponentRef<any>;
                if (this.skip === undefined || this.skip.indexOf(column.name) === -1) {
                    switch (column.name) {
                        case 'gene':
                            if (this.allowPaired) {
                                component = this.rowViewContainer.createComponent(geneComponentResolver);
                                component.instance.generate(entry, this.row.metadata.pairedID, this.hostViewContainer, rowComponentResolver);
                            } else {
                                component = this.rowViewContainer.createComponent(originalComponentResolver);
                                component.instance.generate(`${entry}`);
                            }
                            break;
                        case 'cdr3':
                            component = this.rowViewContainer.createComponent(cdrComponentResolver);
                            component.instance.create(entry, this.row.metadata.cdr3vEnd, this.row.metadata.cdr3jStart);
                            break;
                        case 'reference.id':
                            component = this.rowViewContainer.createComponent(urlComponentResolver);
                            component.instance.generate(entry);
                            break;
                        case 'method':
                        case 'meta':
                        case 'cdr3fix':
                            component = this.rowViewContainer.createComponent(jsonComponentResolver);
                            component.instance.generate(column.title, entry, column);
                            break;
                        default:
                            component = this.rowViewContainer.createComponent(originalComponentResolver);
                            component.instance.generate(entry);
                    }
                    this._components.push(component);
                }
            });
        }
    }

    public ngOnDestroy(): void {
        this._components.forEach((component: ComponentRef<any>) => {
            component.destroy();
        });
    }
}

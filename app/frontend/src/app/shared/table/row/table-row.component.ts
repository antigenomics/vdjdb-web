/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

import {
    ChangeDetectionStrategy, Component, ComponentFactoryResolver, ComponentRef, Input, OnDestroy, OnInit, ViewChild, ViewContainerRef
} from '@angular/core';
import { TableColumn } from '../column/table-column';
import { TableEntryDefaultComponent } from '../entry/table-entry-default.component';
import { TableRow } from './table-row';

@Component({
    selector:        'tr[table-row]',
    template:        '<ng-container #rowViewContainer></ng-container>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TableRowComponent implements OnInit, OnDestroy {
    private _components: Array<ComponentRef<any>> = [];

    @Input('columns')
    public columns: TableColumn[];

    @Input('row')
    public row: TableRow;

    @ViewChild('rowViewContainer', { read: ViewContainerRef })
    public rowViewContainer: ViewContainerRef;

    constructor(private hostViewContainer: ViewContainerRef, private resolver: ComponentFactoryResolver) {}

    public ngOnInit(): void {
        const defaultEntryComponentResolver = this.resolver.resolveComponentFactory(TableEntryDefaultComponent);
        if (this.row.entries) {
            this.row.entries.forEach(async (entry: string, index: number) => {
                const column = this.columns[ index ];
                let entryResolver = this.row.resolveComponentFactory(column, this.resolver);
                if (!entryResolver) {
                    entryResolver = defaultEntryComponentResolver;
                }
                const component = this.rowViewContainer.createComponent(entryResolver);
                component.instance.create(entry, column, this.columns, this.row, this.hostViewContainer, this.resolver);
                this._components.push(component);
            });
        }
    }

    public ngOnDestroy(): void {
        this._components.forEach((component: ComponentRef<any>) => {
            component.destroy();
        });
    }
}

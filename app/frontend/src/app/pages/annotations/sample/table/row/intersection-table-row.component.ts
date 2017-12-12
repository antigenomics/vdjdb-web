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
    ChangeDetectionStrategy, Component, ComponentFactoryResolver, ComponentRef, Input, OnDestroy, OnInit, ViewChild,
    ViewContainerRef
} from '@angular/core';
import { SampleTableService } from '../../sample-table.service';
import { IntersectionTableEntryCdr3aaComponent } from '../entry/intersection-table-entry-cdr3aa.component';
import { IntersectionTableEntryDetailsComponent } from '../entry/intersection-table-entry-details.component';
import { IntersectionTableEntryFrequencyComponent } from '../entry/intersection-table-entry-frequency.component';
import { IntersectionTableEntryOriginalComponent } from '../entry/intersection-table-entry-original.component';
import { IntersectionTableEntryTagsComponent } from '../entry/intersection-table-entry-tags.component';
import { IntersectionTableRow } from './intersection-table-row';

@Component({
    selector:        'tr[intersection-table-row]',
    template:        '<ng-container #rowViewContainer></ng-container>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntersectionTableRowComponent implements OnInit, OnDestroy {
    private _components: Array<ComponentRef<any>> = [];

    @Input('intersection-table-row')
    public row: IntersectionTableRow;

    @ViewChild('rowViewContainer', { read: ViewContainerRef })
    public rowViewContainer: ViewContainerRef;

    constructor(private resolver: ComponentFactoryResolver, private sampleTableService: SampleTableService) {
    }

    public ngOnInit(): void {
        const originalComponentResolver = this.resolver.resolveComponentFactory(IntersectionTableEntryOriginalComponent);
        const frequencyComponentResolver = this.resolver.resolveComponentFactory(IntersectionTableEntryFrequencyComponent);
        const cdr3aaComponentResolver = this.resolver.resolveComponentFactory(IntersectionTableEntryCdr3aaComponent);

        const quickViewComponentResolver = this.resolver.resolveComponentFactory(IntersectionTableEntryDetailsComponent);
        const quickViewComponent = this.rowViewContainer.createComponent(quickViewComponentResolver);
        quickViewComponent.instance.generate(this.row);

        if (this.row.entries) {
            const columns = this.sampleTableService.getColumns();
            this.row.entries.forEach((entry: string, index: number) => {
                const column = columns[ index + 1 ];
                let component: ComponentRef<any>;
                switch (column.name) {
                    case 'freq':
                        component = this.rowViewContainer.createComponent(frequencyComponentResolver);
                        component.instance.generate(entry);
                        break;
                    case 'cdr3aa':
                        component = this.rowViewContainer.createComponent(cdr3aaComponentResolver);
                        component.instance.generate(entry, this.row.metadata);
                        break;
                    default:
                        component = this.rowViewContainer.createComponent(originalComponentResolver);
                        component.instance.generate(entry);
                        break;
                }
                this._components.push(component);
            });
        }

        const tagsComponentResolver = this.resolver.resolveComponentFactory(IntersectionTableEntryTagsComponent);
        const tagsComponent = this.rowViewContainer.createComponent(tagsComponentResolver);
        tagsComponent.instance.generate(this.row.tags);
        this._components.push(tagsComponent);
    }

    public ngOnDestroy(): void {
        this._components.forEach((component: ComponentRef<any>) => {
            component.destroy();
        });
    }
}

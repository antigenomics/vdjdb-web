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

import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, ComponentRef, HostListener, Renderer2, ViewContainerRef
} from '@angular/core';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { TableRowComponent } from 'shared/table/row/table-row.component';
import { NotificationService } from 'utils/notifications/notification.service';
import { SearchTableRow } from '../row/search-table-row';
import { SearchTableService } from '../search-table.service';

@Component({
    selector:        'td[search-table-entry-gene]',
    template:        `<div class="ui active mini centered inline loader" *ngIf="pairedLoading"></div>
                      <i class="plus icon cursor pointer" [class.disabled]="isDisabled()" *ngIf="!visible && !pairedLoading"></i>
                      <i class="minus icon cursor pointer" *ngIf="visible && !pairedLoading"></i><span *ngIf="!pairedLoading">{{ entry }}</span>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryGeneComponent extends TableEntry {
    private _hostViewContainer: ViewContainerRef;
    private _resolver: ComponentFactoryResolver;
    private _columns: TableColumn[];
    private _pairedRow: ComponentRef<any>;

    public visible: boolean = false;
    public pairedLoading: boolean = false;
    public entry: string;
    public pairedID: string;

    constructor(private renderer: Renderer2, private service: SearchTableService, private notifications: NotificationService,
                private changeDetector: ChangeDetectorRef) {
        super();
    }

    public create(entry: string, _column: TableColumn, columns: TableColumn[], row: SearchTableRow,
                  hostViewContainer: ViewContainerRef, resolver: ComponentFactoryResolver): void {
        this.entry = entry;
        this.pairedID = row.metadata.pairedID;

        this._hostViewContainer = hostViewContainer;
        this._resolver = resolver;
        this._columns = columns;
    }

    @HostListener('click')
    public async checkPaired(): Promise<void> {
        if (this.pairedID === '0') {
            this.notifications.warn('Paired', 'Paired not found');
        } else {
            if (this._pairedRow) {
                if (this.visible) {
                    this.renderer.setStyle(this._pairedRow.location.nativeElement, 'display', 'none');
                } else {
                    this.renderer.setStyle(this._pairedRow.location.nativeElement, 'display', 'table-row');
                }
                this.visible = !this.visible;
            } else if (!this.pairedLoading) {
                this.pairedLoading = true;
                const pairedResponse = await this.service.getPaired(this.pairedID, this.entry);
                const rowResolver = this._resolver.resolveComponentFactory(TableRowComponent);
                this._pairedRow = this._hostViewContainer.createComponent(rowResolver);
                this._pairedRow.instance.row = new SearchTableRow(pairedResponse.get('paired'), true);
                this._pairedRow.instance.columns = this._columns;
                this._pairedRow.changeDetectorRef.detectChanges();
                this.renderer.addClass(this._pairedRow.location.nativeElement, 'warning');
                this.renderer.addClass(this._pairedRow.location.nativeElement, 'center');
                this.renderer.addClass(this._pairedRow.location.nativeElement, 'aligned');
                this.visible = true;
                this.pairedLoading = false;
                this.changeDetector.detectChanges();
            } else if (this.pairedLoading) {
                this.notifications.info('Paired', 'Loading...');
            }
        }
    }

    public isDisabled(): boolean {
        return this.pairedID === '0';
    }
}

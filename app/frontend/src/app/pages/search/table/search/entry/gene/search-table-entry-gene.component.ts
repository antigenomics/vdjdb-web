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
    ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactory, ComponentRef, HostListener, Renderer2, ViewContainerRef
} from '@angular/core';
import { NotificationService } from '../../../../../../utils/notifications/notification.service';
import { SearchTableRow } from '../../row/search-table-row';
import { SearchTableService } from '../../search-table.service';

@Component({
    selector:        'td[search-table-entry-gene]',
    template:        `<div class="ui active mini centered inline loader" *ngIf="pairedLoading"></div>
                      <i class="plus icon cursor pointer" [class.disabled]="isDisabled()" *ngIf="!visible && !pairedLoading"></i>
                      <i class="minus icon cursor pointer" *ngIf="visible && !pairedLoading"></i><span *ngIf="!pairedLoading">{{ value }}</span>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryGeneComponent {
    private _hostRowViewContainer: ViewContainerRef;
    private _pairedRow: ComponentRef<any>;
    private _pairedRowResolver: ComponentFactory<any>;

    public visible: boolean = false;
    public pairedLoading: boolean = false;
    public value: string;
    public pairedID: string;

    constructor(private renderer: Renderer2, private table: SearchTableService, private notifications: NotificationService,
                private changeDetector: ChangeDetectorRef) {
    }

    public generate(value: string, pairedID: string, viewContainer: ViewContainerRef, pairedRowResolver: ComponentFactory<any>): void {
        this.value = value;
        this.pairedID = pairedID;
        this._hostRowViewContainer = viewContainer;
        this._pairedRowResolver = pairedRowResolver;
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
                const pairedResponse = await this.table.getPaired(this.pairedID, this.value);
                this._pairedRow = this._hostRowViewContainer.createComponent(this._pairedRowResolver);
                this._pairedRow.instance.row = new SearchTableRow(pairedResponse.get('paired'));
                this._pairedRow.instance.allowPaired = false;
                this._pairedRow.instance.ngOnInit();
                this._pairedRow.changeDetectorRef.detectChanges();
                this.renderer.addClass(this._pairedRow.location.nativeElement, 'warning');
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

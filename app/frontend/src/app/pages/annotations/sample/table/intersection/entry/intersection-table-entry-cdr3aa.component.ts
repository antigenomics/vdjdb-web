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

/* tslint:disable:max-line-length */
import { ChangeDetectionStrategy, Component, ComponentFactoryResolver, HostBinding, ViewContainerRef } from '@angular/core';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { ClipboardService } from 'utils/clipboard/clipboard.service';
import { NotificationService } from 'utils/notifications/notification.service';
import { Utils } from 'utils/utils';
import { IntersectionTableRow } from '../row/intersection-table-row';
import ColorizedPatternRegion = Utils.SequencePattern.ColorizedPatternRegion;

@Component({
    selector:        'td[intersection-table-entry-cdr3aa]',
    template:        `<div style="float: left; height: 20px" [popup]="ntRegions" header="CDR3nt" display="colored-text" class="cursor pointer"
                           footer="Click on 'copy' icon to save nucleotide sequence to clipboard" position="top" width="500">
                            <span *ngFor="let region of aaRegions" [style.color]="region.color">{{ region.part }}</span>
                      </div>
                      <i style="float: right" class="copy icon cursor pointer" (click)="copyToClipboard()"></i>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntersectionTableEntryCdr3aaComponent implements TableEntry {
    @HostBinding('class.hover-inside-icon')
    public hoverIconBinding: boolean = true;

    public aaRegions: ColorizedPatternRegion[] = [];
    public ntRegions: string[] = [];

    constructor(private clipboard: ClipboardService, private notifications: NotificationService) {}

    public create(entry: string, column: TableColumn, columns: TableColumn[], row: IntersectionTableRow,
                  hostViewContainer: ViewContainerRef, resolver: ComponentFactoryResolver): void {
        this.aaRegions = Utils.SequencePattern.colorizePattern(entry, row.metadata.vEnd / 3, row.metadata.jStart / 3);
        this.ntRegions =
            Utils.SequencePattern.colorizePattern(row.metadata.cdr3nt, row.metadata.vEnd, row.metadata.jStart)
                .map((colorizedRegion: ColorizedPatternRegion) => {
                    return `${colorizedRegion.part}|${colorizedRegion.color}`;
                });
    }

    public copyToClipboard(): void {
        if (this.ntRegions.length !== 0) {
            const copyContent = this.ntRegions.map((region) => region.split('|')[ 0 ]).join('');
            const result = this.clipboard.copyFromContent(copyContent);
            if (result) {
                this.notifications.success('Copy to clipboard', 'Copied successfully');
            } else {
                this.notifications.error('Copy to clipboard', 'Your browser is not supported');
            }
        } else {
            this.notifications.warn('Copy to clipboard', 'Empty content');
        }
    }
}
/* tslint:enable:max-line-length */

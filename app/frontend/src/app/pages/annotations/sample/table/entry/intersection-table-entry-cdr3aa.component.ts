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
import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';
import { ClipboardService } from '../../../../../utils/clipboard/clipboard.service';
import { NotificationService } from '../../../../../utils/notifications/notification.service';
import { Utils } from '../../../../../utils/utils';
import { IntersectionTableRowMetadata } from '../row/intersection-table-row-metadata';
import ColorizedPatternRegion = Utils.SequencePattern.ColorizedPatternRegion;

@Component({
    selector:        'td[intersection-table-entry-cdr3aa]',
    templateUrl:     './intersection-table-entry-cdr3aa.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntersectionTableEntryCdr3aaComponent {
    public aaRegions: ColorizedPatternRegion[] = [];
    public ntRegions: string[] = [];

    @HostBinding('class.hover-inside-icon')
    public hoverInsideIconClassProperty: boolean = true;

    constructor(private clipboard: ClipboardService, private notifications: NotificationService) {
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

    public generate(value: string, metadata: IntersectionTableRowMetadata) {
        this.aaRegions = Utils.SequencePattern.colorizePattern(value, metadata.vEnd / 3, metadata.jStart / 3);
        this.ntRegions =
            Utils.SequencePattern.colorizePattern(metadata.cdr3nt, metadata.vEnd, metadata.jStart)
                 .map((colorizedRegion: ColorizedPatternRegion) => {
                     return `${colorizedRegion.part}|${colorizedRegion.color}`;
                 });
    }
}

/* tslint:enable:max-line-length */

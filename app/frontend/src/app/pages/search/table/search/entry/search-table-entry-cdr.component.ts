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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Utils } from '../../../../../utils/utils';
import ColorizedPatternRegion = Utils.SequencePattern.ColorizedPatternRegion;

@Component({
    selector: 'td[search-table-entry-cdr]',
    template: `<span *ngFor="let region of regions" [style.color]="region.color">{{ region.part }}</span>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryCdrComponent {
    public regions: ColorizedPatternRegion[] = [];

    public create(input: string, vEnd: number, jStart: number): void {
        this.regions = Utils.SequencePattern.colorizePattern(input, vEnd, jStart);
    }
}

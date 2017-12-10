/*
 *        Copyright 2017 Bagaev Dmitry
 *
 *        Licensed under the Apache License, Version 2.0 (the "License");
 *        you may not use this file except in compliance with the License.
 *        You may obtain a copy of the License at
 *
 *            http://www.apache.org/licenses/LICENSE-2.0
 *
 *        Unless required by applicable law or agreed to in writing, software
 *        distributed under the License is distributed on an "AS IS" BASIS,
 *        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *        See the License for the specific language governing permissions and
 *        limitations under the License.
 *
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IntersectionTableRowTags } from '../row/intersection-table-row';

@Component({
    selector:        'td[intersection-table-entry-tags]',
    template:        `<div class="ui small basic {{ tag[1] }} label" *ngFor="let tag of values">{{ tag[0] }}</div>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntersectionTableEntryTagsComponent {
    private static readonly _colors: string[] = [ 'teal', 'blue', 'violet', 'red' ];

    public tags: IntersectionTableRowTags;
    public values: Array<[ string, string ]> = [];

    public generate(tags: IntersectionTableRowTags) {
        this.tags = tags;
        this.values = [];

        let index = 0;
        for (const key in this.tags) {
            if (this.tags.hasOwnProperty(key)) {
                this.values = this.values.concat(this.tags[ key ].map((tag) =>
                    [ tag, IntersectionTableEntryTagsComponent._colors[ index ] ] as [ string, string ])
                );
                index += 1;
            }
        }
    }
}

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
import { IntersectionTableRowMatch } from '../row/intersection-table-row-match';

export class IntersectionTableRowTag {
    public readonly label: string;
    public readonly detail: string;

    constructor(label: string, detail: string) {
        this.label = label;
        this.detail = detail;
    }
}

// <div class="detail">{{ tag.detail }}</div>

@Component({
    selector:        'td[intersection-table-entry-tags]',
    template:        `<div class="ui basic mini label" *ngFor="let tag of tags">{{ tag.label }}</div>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntersectionTableEntryTagsComponent {
    public tags: IntersectionTableRowTag[] = [];

    public generate(matches: IntersectionTableRowMatch[]) {
        const epitopeIndex: number = 8;
        const speciesIndex: number = 10;
        const mhcaIndex: number = 5;
        const mhcbIndex: number = 6;

        this.tags = this.tags
            .concat(this.generateTags(matches, epitopeIndex, (s: string) => s.length > 5 ? `${s.substring(0, 5)}..` : s))
            .concat(this.generateTags(matches, speciesIndex, (s: string) => s.length > 5 ? `${s.substring(0, 5)}..` : s))
            .concat(this.generateTags(matches, mhcaIndex))
            .concat(this.generateTags(matches, mhcbIndex));
    }

    private generateTags(matches: IntersectionTableRowMatch[], index: number, transformer?: (s: string) => string): IntersectionTableRowTag[] {
        const array = matches.map((match) => {
            return match.row.entries[index];
        });
        const uniqueMap = this.generateUniqueMap(array);
        const tags: IntersectionTableRowTag[] = [];
        uniqueMap.forEach((value: number, key: string) => {
            tags.push(new IntersectionTableRowTag(transformer ? transformer(key) : key, value.toString()));
        });
        return tags;
    }

    private generateUniqueMap(array: string[]): Map<string, number> {
        const map: Map<string, number> = new Map();

        array.forEach((entry) => {
            if (map.has(entry)) {
                const previousValue = map.get(entry);
                map.set(entry, previousValue + 1);
            } else {
                map.set(entry, 1);
            }
        });

        return map;
    }
}
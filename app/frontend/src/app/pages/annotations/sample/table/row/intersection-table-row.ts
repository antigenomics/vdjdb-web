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

import { SampleItem } from '../../../../../shared/sample/sample-item';
import { IntersectionTableRowMatch } from './intersection-table-row-match';
import { IntersectionTableRowMetadata } from './intersection-table-row-metadata';

export interface IntersectionTableRowTags { [field: string]: string[]; }

export class IntersectionTableRow {
    public readonly index: number;
    public readonly sample: SampleItem;
    public readonly entries: string[];
    public readonly tags: IntersectionTableRowTags;
    public readonly metadata: IntersectionTableRowMetadata;

    public matchesLoaded: boolean = false;
    public matchesCount: number = 0;
    public matches: IntersectionTableRowMatch[];

    constructor(row: any, sample: SampleItem, index: number) {
        this.index = index;
        this.sample = sample;
        /* tslint:disable:no-string-literal */
        this.entries = row[ 'entries' ];
        this.tags = row[ 'tags' ];
        this.metadata = new IntersectionTableRowMetadata(row[ 'metadata' ]);
        /* tslint:enable:no-string-literal */
    }
}

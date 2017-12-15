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

import { ComponentFactory, ComponentFactoryResolver } from '@angular/core';
import { SampleItem } from '../../../../../shared/sample/sample-item';
import { TableColumn } from '../../../../../shared/table/column/table-column';
import { TableEntry } from '../../../../../shared/table/entry/table-entry';
import { TableEntryCenteredComponent } from '../../../../../shared/table/entry/table-entry-centered.component';
import { TableRow } from '../../../../../shared/table/row/table-row';
import { IntersectionTableEntryCdr3aaComponent } from '../entry/intersection-table-entry-cdr3aa.component';
import { IntersectionTableEntryDetailsComponent } from '../entry/intersection-table-entry-details.component';
import { IntersectionTableEntryFrequencyComponent } from '../entry/intersection-table-entry-frequency.component';
import { IntersectionTableEntryTagsComponent } from '../entry/intersection-table-entry-tags.component';
import { MatchTableRow } from '../matches/row/match-table-row';

export interface IntersectionTableRowTags {
    [field: string]: string[];
}

export class IntersectionTableRowMetadata {
    public readonly vEnd: number;
    public readonly jStart: number;
    public readonly cdr3nt: string;

    constructor(meta: any) {
        /* tslint:disable:no-string-literal */
        this.vEnd = meta['vEnd'];
        this.jStart = meta['jStart'];
        this.cdr3nt = meta['cdr3nt'];
        /* tslint:enable:no-string-literal */
    }
}

export class IntersectionTableRow extends TableRow {
    public readonly entries: string[];
    public readonly index: number;
    public readonly sample: SampleItem;
    public readonly tags: IntersectionTableRowTags;
    public readonly metadata: IntersectionTableRowMetadata;

    public matchesLoaded: boolean = false;
    public matchesCount: number = 0;
    public matches: MatchTableRow[];

    constructor(row: any, index: number, sample: SampleItem) {
        /* tslint:disable:no-string-literal */
        super();
        this.entries = row[ 'entries' ];
        this.index = index;
        this.sample = sample;
        this.tags = row[ 'tags' ];
        this.metadata = new IntersectionTableRowMetadata(row[ 'metadata' ]);
        /* tslint:enable:no-string-literal */
    }

    public getEntries(): string[] {
        return this.entries;
    }

    public resolveComponentFactory(column: TableColumn, resolver: ComponentFactoryResolver): ComponentFactory<TableEntry> {
        if (column.name === 'details') {
            return resolver.resolveComponentFactory(IntersectionTableEntryDetailsComponent);
        } else if (column.name === 'freq') {
            return resolver.resolveComponentFactory(IntersectionTableEntryFrequencyComponent);
        } else if (column.name === 'cdr3aa') {
            return resolver.resolveComponentFactory(IntersectionTableEntryCdr3aaComponent);
        } else if (column.name === 'tags') {
            return resolver.resolveComponentFactory(IntersectionTableEntryTagsComponent);
        } else {
            return resolver.resolveComponentFactory(TableEntryCenteredComponent);
        }
    }
}

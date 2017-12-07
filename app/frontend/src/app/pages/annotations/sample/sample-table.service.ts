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

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs/Subject';
import { SampleItem } from '../../../shared/sample/sample-item';
import { AnnotationsService } from '../annotations.service';
import { IntersectionTableColumnInfo } from './table/column/intersection-table-column-info';
import { IntersectionTable } from './table/intersection-table';

export type SampleTableServiceEventType = number;

export namespace SampleTableServiceEventType {
    export const TABLE_LOADING: number = 0;
    export const TABLE_UPDATED: number = 1;
}

export class SampleTableServiceEvent {
    public readonly name: string;
    public readonly type: SampleTableServiceEventType;

    constructor(name: string, type: SampleTableServiceEventType) {
        this.name = name;
        this.type = type;
    }
}

// TODO delete cache table if sample deleted

@Injectable()
export class SampleTableService {
    private _tables: Map<string, IntersectionTable> = new Map();
    private _events: Subject<SampleTableServiceEvent> = new Subject();

    constructor(private annotationsService: AnnotationsService) {}

    public getTable(sample: SampleItem): IntersectionTable {
        return this._tables.get(sample.name);
    }

    public getOrCreateTable(sample: SampleItem): IntersectionTable {
        const table = this.isTableExist(sample) ? this.getTable(sample) : new IntersectionTable(sample);
        this._tables.set(sample.name, table);
        return table;
    }

    public async intersect(sample: SampleItem) {
        const table = this.getTable(sample);
        table.loading();
        this._events.next(new SampleTableServiceEvent(sample.name, SampleTableServiceEventType.TABLE_LOADING));
        const response = await this.annotationsService.intersect(sample);
        table.update(response.get('rows'));
        this._tables.set(sample.name, table);
        this._events.next(new SampleTableServiceEvent(sample.name, SampleTableServiceEventType.TABLE_UPDATED));
    }

    public isTableExist(sample: SampleItem): boolean {
        return this._tables.has(sample.name);
    }

    public getEvents(): Subject<SampleTableServiceEvent> {
        return this._events;
    }

    public getColumns(): IntersectionTableColumnInfo[] {
        return [
            new IntersectionTableColumnInfo('id', 'ID', 'one wide'),
            new IntersectionTableColumnInfo('found', 'Found', 'one wide'),
            new IntersectionTableColumnInfo('freq', 'Frequency', 'one wide'),
            new IntersectionTableColumnInfo('count', 'Count', 'one wide'),
            new IntersectionTableColumnInfo('cdr3aa', 'CDR3aa', 'eight wide'),
            new IntersectionTableColumnInfo('v', 'V', 'two wide'),
            new IntersectionTableColumnInfo('j', 'J', 'two wide')
        ];
    }

}
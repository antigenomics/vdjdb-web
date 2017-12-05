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
import { SampleItem } from '../../../../shared/sample/sample-item';
import { AnnotationsService } from '../../annotations.service';
import { IntersectionTable } from './intersection-table';

export type IntersectionTableServiceEventType = number;

export namespace IntersectionTableServiceEventType {
    export const TABLE_UPDATED: number = 1;
}

export class IntersectionTableServiceEvent {
    public readonly name: string;
    public readonly type: IntersectionTableServiceEventType;

    constructor(name: string, type: IntersectionTableServiceEventType) {
        this.name = name;
        this.type = type;
    }
}

// TODO delete cache table if sample deleted

@Injectable()
export class IntersectionTableService {
    private _tables: Map<string, IntersectionTable> = new Map();
    private _events: Subject<IntersectionTableServiceEvent> = new Subject();

    constructor(private annotationsService: AnnotationsService) {
    }

    public getTable(sample: SampleItem): IntersectionTable {
        return this._tables.get(sample.name);
    }

    public async intersect(sample: SampleItem) {
        const response = await this.annotationsService.intersect(sample);
        const rows = response.get('rows');
        const table = new IntersectionTable(sample, rows);

        this._tables.set(sample.name, table);
        this._events.next(new IntersectionTableServiceEvent(sample.name, IntersectionTableServiceEventType.TABLE_UPDATED));
    }

    public isTableExist(sample: SampleItem): boolean {
        return this._tables.has(sample.name);
    }

    public getEvents(): Subject<IntersectionTableServiceEvent> {
        return this._events;
    }

}

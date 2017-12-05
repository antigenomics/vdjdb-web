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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { SampleItem } from '../../../../shared/sample/sample-item';
import { LoggerService } from '../../../../utils/logger/logger.service';
import { IntersectionTable } from './intersection-table';
import { IntersectionTableService, IntersectionTableServiceEvent, IntersectionTableServiceEventType } from './intersection-table.service';

@Component({
    selector:        'intersection-table',
    templateUrl:     './intersection-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntersectionTableComponent implements OnInit, OnDestroy {
    private _intersectionTableServiceEventsSubscription: Subscription;
    public table: IntersectionTable;

    @Input('sample')
    public sample: SampleItem;

    constructor(private intersectionTableService: IntersectionTableService,
                private changeDetector: ChangeDetectorRef, private logger: LoggerService) {}

    public ngOnInit(): void {
        if (this.intersectionTableService.isTableExist(this.sample)) {
            this.table = this.intersectionTableService.getTable(this.sample);
        }
        this._intersectionTableServiceEventsSubscription = this.intersectionTableService.getEvents()
            .subscribe((event: IntersectionTableServiceEvent) => {
                switch (event.type) {
                    case IntersectionTableServiceEventType.TABLE_UPDATED:
                        if (event.name === this.sample.name) {
                            this.logger.debug('Intersection table update', this.intersectionTableService.getTable(this.sample));
                            this.table = this.intersectionTableService.getTable(this.sample);
                            this.changeDetector.detectChanges();
                        }
                        break;
                    default:

                }
            });
    }

    public isTableInitialized(): boolean {
        return this.table !== undefined;
    }

    public ngOnDestroy(): void {
        if (this._intersectionTableServiceEventsSubscription) {
            this._intersectionTableServiceEventsSubscription.unsubscribe();
        }
    }
}

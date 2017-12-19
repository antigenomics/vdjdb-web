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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { SampleItem } from '../../../../shared/sample/sample-item';
import { LoggerService } from '../../../../utils/logger/logger.service';
import { IntersectionTableFilters } from './intersection/filters/intersection-table-filters';
import { IntersectionTable } from './intersection/intersection-table';
import { SampleTableService, SampleTableServiceEvent, SampleTableServiceEventType } from './sample-table.service';

@Component({
    selector:        'sample-table',
    templateUrl:     './sample-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleTableComponent implements OnInit, OnDestroy {
    private _routeSampleSubscription: Subscription;
    private _intersectionTableServiceEventsSubscription: Subscription;

    public sample: SampleItem;
    public table: IntersectionTable;
    public filters: IntersectionTableFilters;

    constructor(private activatedRoute: ActivatedRoute, private changeDetector: ChangeDetectorRef,
                private sampleTableService: SampleTableService, private logger: LoggerService) {
        this.sample = this.activatedRoute.snapshot.data.sample;
        this.table = this.sampleTableService.getOrCreateTable(this.sample);
        this.filters = this.sampleTableService.getOrCreateFilters(this.sample);
    }

    public ngOnInit(): void {
        this._routeSampleSubscription = this.activatedRoute.data.subscribe((data: { sample: SampleItem }) => {
            this.sample = data.sample;
            this.table = this.sampleTableService.getOrCreateTable(this.sample);
            this.filters = this.sampleTableService.getOrCreateFilters(this.sample);
            this.changeDetector.detectChanges();
        });

        this._intersectionTableServiceEventsSubscription =
            this.sampleTableService.getEvents().subscribe((event: SampleTableServiceEvent) => {
                if (event.name === this.sample.name) {
                    this.changeDetector.detectChanges();
                    switch (event.type) {
                        case SampleTableServiceEventType.TABLE_UPDATED:
                            this.logger.debug('Sample table update', this.sampleTableService.getTable(this.sample));
                            break;
                        default:

                    }
                }
            });
    }

    public intersect(): void {
        this.sampleTableService.intersect(this.sample);
    }

    public ngOnDestroy(): void {
        if (this._routeSampleSubscription) {
            this._routeSampleSubscription.unsubscribe();
        }
        if (this._intersectionTableServiceEventsSubscription) {
            this._intersectionTableServiceEventsSubscription.unsubscribe();
        }
    }
}

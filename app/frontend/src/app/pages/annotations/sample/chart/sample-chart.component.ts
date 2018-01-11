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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SampleService, SampleServiceEvent, SampleServiceEventType } from 'pages/annotations/sample/sample.service';
import { IntersectionTableFilters } from 'pages/annotations/sample/table/intersection/filters/intersection-table-filters';
import { IntersectionTable } from 'pages/annotations/sample/table/intersection/intersection-table';
import { SummaryFieldCounter } from 'pages/annotations/sample/table/intersection/summary/summary-field-counter';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { IBarChartHorizontalDataEntry } from 'shared/charts/bar/horizontal/bar-chart-horizontal';
import { ChartEventType, IChartEvent } from 'shared/charts/chart-events';
import { IChartContainerConfiguration } from 'shared/charts/container/chart-container-configuration';
import { SampleItem } from 'shared/sample/sample-item';
import { LoggerService } from 'utils/logger/logger.service';
import { Utils } from 'utils/utils';
import Time = Utils.Time;
import UPDATE_DATA = ChartEventType.UPDATE_DATA;

@Component({
    selector:        'sample-chart',
    templateUrl:     './sample-chart.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleChartComponent implements OnInit, OnDestroy {
    private _routeSampleSubscription: Subscription;
    private _intersectionTableServiceEventsSubscription: Subscription;

    private _data: IBarChartHorizontalDataEntry[] = [];

    public sample: SampleItem;
    public table: IntersectionTable;
    public filters: IntersectionTableFilters;

    constructor(private activatedRoute: ActivatedRoute, private sampleService: SampleService,
                private changeDetector: ChangeDetectorRef, private logger: LoggerService) {
        this.sample = this.activatedRoute.snapshot.data.sample;
        this.table = this.sampleService.getOrCreateTable(this.sample);
        this.filters = this.sampleService.getOrCreateFilters(this.sample);
    }

    public ngOnInit(): void {
        this._routeSampleSubscription = this.activatedRoute.data.subscribe((data: { sample: SampleItem }) => {
            this.sample = data.sample;
            this.table = this.sampleService.getOrCreateTable(this.sample);
            this.filters = this.sampleService.getOrCreateFilters(this.sample);
            this.changeDetector.detectChanges();
        });

        this._intersectionTableServiceEventsSubscription =
            this.sampleService.getEvents().subscribe((event: SampleServiceEvent) => {
                if (event.name === this.sample.name) {
                    this.changeDetector.detectChanges();
                    switch (event.type) {
                        case SampleServiceEventType.EVENT_UPDATED:
                            this.logger.debug('Sample table update', this.sampleService.getTable(this.sample));
                            break;
                        default:

                    }
                }
            });
    }

    public getData(): SummaryFieldCounter[] {
        if (this.table.isSummaryExist()) {
            return this.table.getSummary();
        }
        return undefined;
    }

    public intersect(): void {
        this.sampleService.intersect(this.sample);
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

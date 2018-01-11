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

import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { SampleChartService } from 'pages/annotations/sample/chart/sample-chart.service';
import { SampleService, SampleServiceEventType } from 'pages/annotations/sample/sample.service';
import { SummaryFieldCounter } from 'pages/annotations/sample/table/intersection/summary/summary-field-counter';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { IBarChartHorizontalDataEntry } from 'shared/charts/bar/horizontal/bar-chart-horizontal';
import { ChartEventType, IChartEvent } from 'shared/charts/chart-events';
import { IChartContainerConfiguration } from 'shared/charts/container/chart-container-configuration';
import INITIAL_DATA = ChartEventType.INITIAL_DATA;

@Component({
    selector:    'div[summary-chart]',
    templateUrl: './summary-chart.component.html'
})
export class SummaryChartComponent implements OnInit, OnDestroy {
    private sampleServiceEventsSubscription: Subscription;

    public configuration: IChartContainerConfiguration;
    public stream: Subject<IChartEvent<IBarChartHorizontalDataEntry>> = new ReplaySubject(1);

    @Input('data')
    public set setData(data: SummaryFieldCounter[]) {
        if (data) {
            const chartData = data[ 0 ].counters.map((c) => {
                return { name: c.field, value: c.unique };
            });
            this.stream.next({ type: INITIAL_DATA, data: chartData });
        }
    }

    constructor(private sampleChartService: SampleChartService, private sampleService: SampleService,
                private changeDetector: ChangeDetectorRef) {
    }

    public ngOnInit(): void {
        this.sampleServiceEventsSubscription = this.sampleService.getEvents().subscribe((event) => {
            if (event.type === SampleServiceEventType.EVENT_UPDATED) {
                this.changeDetector.detectChanges();
            }
        });
    }

    public ngOnDestroy(): void {
        if (this.sampleServiceEventsSubscription) {
            this.sampleServiceEventsSubscription.unsubscribe();
        }
    }
}

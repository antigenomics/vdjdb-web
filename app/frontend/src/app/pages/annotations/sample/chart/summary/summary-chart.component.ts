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
import { SampleChartComponentType } from 'pages/annotations/sample/chart/sample-chart.service';
import { SampleService, SampleServiceEventType } from 'pages/annotations/sample/sample.service';
import { SummaryFieldCounter } from 'pages/annotations/sample/table/intersection/summary/summary-field-counter';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { IBarChartHorizontalDataEntry } from 'shared/charts/bar/horizontal/bar-chart-horizontal';
import { ChartEventType, IChartEvent } from 'shared/charts/chart-events';

@Component({
    selector:    'div[summary-chart]',
    templateUrl: './summary-chart.component.html'
})
export class SummaryChartComponent {
    private currentField: number = 0;

    public data: SummaryFieldCounter[];
    public stream: Subject<IChartEvent<IBarChartHorizontalDataEntry>> = new ReplaySubject(1);

    @Input('data')
    public set setData(data: SummaryFieldCounter[]) {
        this.data = data;
        this.updateStream();

    }

    constructor(private sampleService: SampleService, private changeDetector: ChangeDetectorRef) {
    }

    public getFields(): string[] {
        return this.data.map((d) => d.name);
    }

    public getCurrentFieldTitle(): string {
        return this.data[ this.currentField ].name;
    }

    public setCurrentField(index: number): void {
        this.currentField = index;
        this.updateStream();
    }

    private updateStream(): void {
        this.stream.next({
            type: ChartEventType.UPDATE_DATA, data: this.data[ this.currentField ].counters.map((c) => {
                return { name: c.field, value: c.unique };
            })
        });
    }

}
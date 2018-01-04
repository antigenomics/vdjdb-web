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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { BarChartHorizontalDataEntry } from 'shared/charts/bar/horizontal/bar-chart-horizontal';
import { ChartEvent, ChartEventType } from 'shared/charts/common/chart-events';

import { IChartContainerConfiguration } from 'shared/charts/container/chart-container-configuration';
import { SampleItem } from 'shared/sample/sample-item';

@Component({
    selector:        'sample-chart',
    templateUrl:     './sample-chart.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleChartComponent implements OnInit {
    private _routeSampleSubscription: Subscription;
    private _count: number = 0;

    public sample: SampleItem;
    public configuration: IChartContainerConfiguration;

    public stream: Subject<ChartEvent<BarChartHorizontalDataEntry>> = new ReplaySubject(1);

    constructor(private activatedRoute: ActivatedRoute, private changeDetector: ChangeDetectorRef) {
        this.sample = this.activatedRoute.snapshot.data.sample;
        this.configuration = {
            margin: {
                left: 25, right: 25, top: 20, bottom: 20
            }
        };

        const max = 20;
        const min = 10;
        const count = Math.floor(Math.random() * (max - 1)) + min;
        const data: BarChartHorizontalDataEntry[] = [];
        for (let i = 0; i < count; ++i) {
            data.push({
                name:  `${i}`,
                value: Math.floor(Math.random() * (max - 1)) + 1
            });
        }

        this.stream.next({
            type: ChartEventType.INITIAL_DATA,
            data: data
        });
        this._count = data.length;
    }

    public updateValues(): void {
        const max = 100;
        const min = 10;
        const count = this._count;
        const data: BarChartHorizontalDataEntry[] = [];
        for (let i = 0; i < count; ++i) {
            data.push({
                name:  `${i}`,
                value: Math.floor(Math.random() * max) + 1
            });
        }

        this.stream.next({
            type: ChartEventType.UPDATE_VALUES,
            data: data
        });
    }

    public ngOnInit(): void {
        this._routeSampleSubscription = this.activatedRoute.data.subscribe((data: { sample: SampleItem }) => {
            this.sample = data.sample;
            this.changeDetector.detectChanges();
        });
    }
}

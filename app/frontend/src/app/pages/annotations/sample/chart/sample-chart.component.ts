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
import { Subscription } from 'rxjs/Subscription';
import { BarChartDataEntry } from 'shared/charts/bar/bar-chart';
import { IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { SampleItem } from 'shared/sample/sample-item';

@Component({
    selector:        'sample-chart',
    templateUrl:     './sample-chart.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleChartComponent implements OnInit {
    private _routeSampleSubscription: Subscription;

    public sample: SampleItem;
    public configuration: IBarChartConfiguration;
    public data: BarChartDataEntry[] = [];

    constructor(private activatedRoute: ActivatedRoute, private changeDetector: ChangeDetectorRef) {
        this.sample = this.activatedRoute.snapshot.data.sample;
        this.configuration = {
            container: {
                margin: {
                    left: 25, right: 25, top: 20, bottom: 20
                }
            },
            type:      'horizontal'
        };

        const max = 20;
        const min = 0;
        const count = Math.floor(Math.random() * (max - min)) + min;
        for (let i = 0; i < count; ++i) {
            this.data.push({
                domain: `${i}`,
                value:  Math.floor(Math.random() * (max - min)) + min
            });
        }
    }

    public updateData(): void {
        const newData = [];
        const max = 20;
        const min = 0;
        const count = Math.floor(Math.random() * (max - min)) + min;
        for (let i = 0; i < count; ++i) {
            newData.push({
                domain: `${i}`,
                value:  Math.floor(Math.random() * (max - min)) + min
            });
        }
        this.data = newData;
        this.changeDetector.detectChanges();
    }

    public ngOnInit(): void {
        this._routeSampleSubscription = this.activatedRoute.data.subscribe((data: { sample: SampleItem }) => {
            this.sample = data.sample;
            this.changeDetector.detectChanges();
        });
    }
}

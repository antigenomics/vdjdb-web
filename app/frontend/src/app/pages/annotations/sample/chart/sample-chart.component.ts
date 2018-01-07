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
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { IBarChartHorizontalDataEntry } from 'shared/charts/bar/horizontal/bar-chart-horizontal';
import { ChartEventType, IChartEvent } from 'shared/charts/chart-events';
import { IChartContainerConfiguration } from 'shared/charts/container/chart-container-configuration';
import { SampleItem } from 'shared/sample/sample-item';
import { Utils } from 'utils/utils';
import Time = Utils.Time;

@Component({
    selector:        'sample-chart',
    templateUrl:     './sample-chart.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleChartComponent implements OnInit, OnDestroy {
    private _debouncedResizeListener: any;
    private _routeSampleSubscription: Subscription;

    private _data: IBarChartHorizontalDataEntry[] = [];

    public sample: SampleItem;
    public configuration: IChartContainerConfiguration;

    public stream: Subject<IChartEvent<IBarChartHorizontalDataEntry>> = new ReplaySubject(1);

    constructor(private activatedRoute: ActivatedRoute, private renderer: Renderer2,
                private changeDetector: ChangeDetectorRef) {
        this.sample = this.activatedRoute.snapshot.data.sample;
        this.configuration = {
            margin: {
                left: 80, right: 25, top: 20, bottom: 20
            }
        };
    }

    public update(): void {
        this._data = this.generateRandomData(Math.floor(Math.random() * 20) + 1, 1, 100);
        this.stream.next({ type: ChartEventType.UPDATE_DATA, data: this._data });
    }

    public updateValues(): void {
        this._data = this.generateRandomData(this._data.length, 1, 100);
        this.stream.next({ type: ChartEventType.UPDATE_VALUES, data: this._data });
    }

    public ngOnInit(): void {
        this._routeSampleSubscription = this.activatedRoute.data.subscribe((data: { sample: SampleItem }) => {
            this.sample = data.sample;
            this.changeDetector.detectChanges();
        });

        this._data = this.generateRandomData(20, 10, 20);
        this.stream.next({ type: ChartEventType.INITIAL_DATA, data: this._data });

        this._debouncedResizeListener = Utils.Time.debounce(() => {
            this.stream.next({ type: ChartEventType.RESIZE, data: this._data });
        });

        this.renderer.listen('window', 'resize', this._debouncedResizeListener);
    }

    public ngOnDestroy(): void {
        if (this._debouncedResizeListener) {
            this._debouncedResizeListener();
        }
    }

    private generateRandomData(count: number, min: number, max: number): IBarChartHorizontalDataEntry[] {
        const data: IBarChartHorizontalDataEntry[] = [];
        for (let i = 0; i < count; ++i) {
            data.push({ name: `some text ${i}`, value: Math.floor(Math.random() * (max - min)) + min });
        }
        return data;
    }
}

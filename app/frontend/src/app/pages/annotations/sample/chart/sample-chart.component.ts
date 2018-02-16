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

import { AfterViewInit, ChangeDetectorRef, Component, OnDestroy, Renderer2, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ISampleChartComponentItem, SampleChartService } from 'pages/annotations/sample/chart/sample-chart.service';
import { SampleRouteResolverComponent } from 'pages/annotations/sample/common/sample-route-resolver.component';
import { SampleService } from 'pages/annotations/sample/sample.service';
import { Utils } from 'utils/utils';

@Component({
    selector:        'sample-chart',
    templateUrl:     './sample-chart.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleChartComponent extends SampleRouteResolverComponent implements AfterViewInit, OnDestroy {
    private resizeWindowListener: () => void;
    private resizeDebouncedHandler = Utils.Time.debounce(() => {
        this.sampleChartService.fireResizeEvent();
    });

    constructor(private sampleChartService: SampleChartService, private renderer: Renderer2,
                sampleService: SampleService, activatedRoute: ActivatedRoute, changeDetector: ChangeDetectorRef) {
        super(activatedRoute.parent.data, activatedRoute.parent.snapshot, changeDetector, sampleService);
    }

    public ngAfterViewInit(): void {
        this.resizeWindowListener = this.renderer.listen('window', 'resize', this.resizeDebouncedHandler);
    }

    public addChart(type: string): void {
        this.sampleChartService.addSampleChart(this.sample, type);
    }

    public removeChart(chart: ISampleChartComponentItem): void {
        this.sampleChartService.removeSampleChart(this.sample, chart);
    }

    public getCharts(): ISampleChartComponentItem[] {
        return this.sampleChartService.getSampleCharts(this.sample);
    }

    public trackChartFn(_index: number, item: ISampleChartComponentItem) {
        return item.id;
    }

    public ngOnDestroy(): void {
        super.ngOnDestroy();
        this.resizeWindowListener();
    }
}

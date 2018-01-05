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

import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { BarChartHorizontal, IBarChartHorizontalDataEntry } from 'shared/charts/bar/horizontal/bar-chart-horizontal';
import { ChartEventType, IChartEvent } from 'shared/charts/chart-events';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { IChartContainerConfiguration } from 'shared/charts/container/chart-container-configuration';

@Component({
    selector:  'bar-chart',
    template:  '<div #container style="width: 100%; height: 100%"></div>',
    styleUrls: [ '../bar-chart.styles.css' ]
})
export class BarChartHorizontalComponent implements AfterViewInit, OnDestroy {
    private chart: BarChartHorizontal;

    @ViewChild('container', { read: ElementRef })
    public containerElementRef: ElementRef;

    @Input('configuration')
    public configuration: IChartContainerConfiguration;

    @Input('stream')
    public stream: Observable<IChartEvent<IBarChartHorizontalDataEntry>>;

    public ngAfterViewInit(): void {
        const container = new ChartContainer(this.containerElementRef, this.configuration);
        this.chart = new BarChartHorizontal(container, this.stream);
    }

    public ngOnDestroy(): void {
        this.chart.destroy();
    }
}

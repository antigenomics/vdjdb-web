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
import * as d3 from 'external/d3';
import { BarChart, BarChartDataEntry } from 'shared/charts/bar/bar-chart';
import { createDefaultBarChartConfiguration, IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { IChartContainerConfiguration } from 'shared/charts/container/chart-container-configuration';
import { Configuration } from 'utils/configuration/configuration';

@Component({
    selector:  'bar-chart',
    template:  '<div #container style="width: 100%; height: 100%"></div>',
    styleUrls: [ './bar-chart.styles.css' ]
})
export class BarChartComponent implements AfterViewInit, OnDestroy {

    private container: ChartContainer;
    private chart: BarChart;
    private data: BarChartDataEntry[];

    @ViewChild('container', { read: ElementRef })
    private containerElementRef: ElementRef;

    @Input('configuration')
    private configuration: IBarChartConfiguration;

    @Input('data')
    public set setData(newData: BarChartDataEntry[]) {
        if (this.data) {
            this.data = newData;
            this.chart.update(this.data);
        } else {
            this.data = newData;
        }
    }

    public ngAfterViewInit(): void {
        this.container = new ChartContainer(this.containerElementRef, this.configuration.container);
        this.chart = new BarChart(this.container);
        this.chart.create(this.data, this.configuration);
    }

    public ngOnDestroy(): void {
        this.container.getContainer().remove();
    }
}


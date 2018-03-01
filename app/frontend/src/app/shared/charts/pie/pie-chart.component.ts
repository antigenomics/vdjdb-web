/*
 *      Copyright 2017 Bagaev Dmitry
 *
 *      Licensed under the Apache License, Version 2.0 (the "License");
 *      you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *          http://www.apache.org/licenses/LICENSE-2.0
 *
 *      Unless required by applicable law or agreed to in writing, software
 *      distributed under the License is distributed on an "AS IS" BASIS,
 *      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *      See the License for the specific language governing permissions and
 *      limitations under the License.
 */

import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { ChartInputStreamType } from 'shared/charts/chart';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { PieChart } from 'shared/charts/pie/pie-chart';
import { createDefaultPieChartConfiguration, IPieChartConfiguration } from 'shared/charts/pie/pie-chart-configuration';
import { Configuration } from 'utils/configuration/configuration';

@Component({
    selector: 'pie-chart',
    template:  '<div #container style="width: 100%; height: 100%"></div>',
    styleUrls: [ './pie-chart.styles.css' ]
})
export class PieChartComponent implements AfterViewInit, OnDestroy {
    private chart: PieChart;

    @Input('configuration')
    public configuration: IPieChartConfiguration = createDefaultPieChartConfiguration();

    @Input('stream')
    public stream: ChartInputStreamType;

    @ViewChild('container', { read: ElementRef })
    public containerElementRef: ElementRef;

    constructor(private ngZone: NgZone) {}

    public ngAfterViewInit(): void {
        const configuration = createDefaultPieChartConfiguration();
        Configuration.extend(configuration, this.configuration);

        const container = new ChartContainer(this.containerElementRef, configuration.container);
        this.chart = new PieChart(configuration, container, this.stream, this.ngZone);
    }

    public ngOnDestroy(): void {
        this.chart.destroy();
    }
}

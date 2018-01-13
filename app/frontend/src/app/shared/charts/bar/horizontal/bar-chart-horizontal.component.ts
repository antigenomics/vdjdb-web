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
import { createDefaultBarChartConfiguration, IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { BarChartHorizontal, BarChartInputStreamType, IBarChartHorizontalDataEntry } from 'shared/charts/bar/horizontal/bar-chart-horizontal';
import { IChartEvent } from 'shared/charts/chart-events';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { IChartContainerConfiguration } from 'shared/charts/container/chart-container-configuration';
import { Configuration } from 'utils/configuration/configuration';

@Component({
    selector:  'bar-chart',
    template:  '<div #container style="width: 100%; height: 100%"></div>',
    styleUrls: [ '../bar-chart.styles.css' ]
})
export class BarChartHorizontalComponent implements AfterViewInit, OnDestroy {
    private chart: BarChartHorizontal;

    @Input('configuration')
    public configuration: IBarChartConfiguration = createDefaultBarChartConfiguration();

    @Input('stream')
    public stream: BarChartInputStreamType;

    @ViewChild('container', { read: ElementRef })
    public containerElementRef: ElementRef;

    public ngAfterViewInit(): void {
        const configuration = createDefaultBarChartConfiguration();
        Configuration.extend(configuration, this.configuration);

        const container = new ChartContainer(this.containerElementRef, configuration.container);
        this.chart = new BarChartHorizontal(configuration, container, this.stream);
    }

    public ngOnDestroy(): void {
        this.chart.destroy();
    }
}

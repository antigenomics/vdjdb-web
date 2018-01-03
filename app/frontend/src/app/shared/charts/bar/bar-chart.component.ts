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

import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import * as d3 from 'external/d3';
import { createDefaultBarChartConfiguration, IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { IChartContainerConfiguration } from 'shared/charts/container/chart-container-configuration';
import { Configuration } from 'utils/configuration/configuration';

@Component({
    selector:  'bar-chart',
    template:  '<div #container style="width: 100%; height: 100%"></div>',
    styleUrls: [ './bar-chart.styles.css' ]
})
export class BarChartComponent implements AfterViewInit {
    private configuration: IBarChartConfiguration = createDefaultBarChartConfiguration();
    private container: ChartContainer;

    @ViewChild('container', { read: ElementRef })
    private containerElementRef: ElementRef;

    @Input('configuration')
    set setConfiguration(configuration: IBarChartConfiguration) {
        this.configuration = createDefaultBarChartConfiguration();
        Configuration.extend(this.configuration, configuration);
    }

    public ngAfterViewInit(): void {
        const max = 50;
        const min = 10;
        const count = Math.floor(Math.random() * (max - min)) + min;
        const data: number[] = [];
        for (let i = 0; i < count; ++i) {
            data.push(Math.floor(Math.random() * (max - min)) + min);
        }

        this.container = new ChartContainer(this.containerElementRef, this.configuration.container);

        const svg = this.container.getContainer();
        const width = this.container.getWidth();
        const height = this.container.getHeight();

        const barSize = this.calculateBarWidth(data, width, height);
        const gapSize = barSize * this.configuration.gap;

        const heights = this.calculateBarHeight(data, width, height);
        svg.attr('class', 'bar-chart')
           .selectAll('rect')
           .data(data)
           .enter().append('rect')
           .attr('class', 'bar')
           .attr('height', (d, i) => heights[ i ])
           .attr('width', barSize)
           .attr('x', (d, i) => (i + 1) * gapSize + i * barSize)
           .attr('y', (d, i) => height - heights[ i ]);

        if (this.configuration.type === 'horizontal') {
            svg.attr('transform', `${svg.attr('transform')}, rotate(90), translate(0, -${height})`);
        }
    }

    private calculateBarWidth(data: number[], width: number, height: number): number {
        const count = data.length;
        switch (this.configuration.type) {
            case 'bar':
                return width / (count + (count + 1) * this.configuration.gap);
            case 'horizontal':
                return height / (count + (count + 1) * this.configuration.gap);
            default:
                throw new Error(`Unexpected bar type ${this.configuration.type}`);
        }
    }

    private calculateBarHeight(data: number[], width: number, height: number): number[] {
        const max = d3.max(data);
        switch (this.configuration.type) {
            case 'bar':
                return data.map((d) => height * d / max);
            case 'horizontal':
                return data.map((d) => width * d / max);
            default:
                throw new Error(`Unexpected bar type ${this.configuration.type}`);
        }
    }
}

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

import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as d3 from 'external/d3';
import { ChartComponent } from 'shared/charts/chart.component';

@Component({
    selector:  'chart-horizontal-bar',
    template:  '<div #chartContainer style="width: 100%; height: 400px"></div>',
    styleUrls: [ './chart-bar.styles.css' ]
})
export class ChartHorizontalBarComponent extends ChartComponent implements AfterViewInit {
    @ViewChild('chartContainer', { read: ElementRef })
    public chartContainer: ElementRef;

    public ngAfterViewInit(): void {
        const data = [ 23, 13, 21, 14, 37, 15, 18, 34, 30, 23, 13, 21, 14, 37, 15, 18, 34, 30 ];
        const dataLength = data.length;
        const { width, height } = this.chartContainer.nativeElement.getBoundingClientRect();

        const wb = 10 * width / (11 * dataLength - 1);

        const svg = d3.select(this.chartContainer.nativeElement)
                      .append('svg')
                      .attr('height', '100%')
                      .attr('width', '100%');

        svg.selectAll('rect')
           .data(data)
           .enter().append('rect')
           .attr('class', 'bar')
           .attr('height', (d) => d * 10)
           .attr('width', wb)
           .attr('x', (d, i) => i * (wb + wb / 10) + wb / 10)
           .attr('y', (d, i) => height - (d * 10));

        svg.selectAll('text')
           .data(data)
           .enter().append('text')
           .text((d) => d)
           .attr('class', 'text')
           .attr('x', (d, i) => i * (wb + wb / 10) + wb / 2)
           .attr('y', (d, i) => height + 15 - (d * 10));

    }
}

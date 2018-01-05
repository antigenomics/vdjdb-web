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

import * as d3 from 'external/d3';
import { ChartContainer } from 'shared/charts/container/chart-container';

export interface IBarChartHorizontalDataEntry {
    readonly name: string;
    readonly value: number;
}

export class BarChartHorizontal {
    private static readonly defaultTransitionDuration: number = 750;
    private static readonly defaultPadding: number = 0.1;
    private static readonly defaultXMargin: number = 5;

    constructor(private container: ChartContainer) {
    }

    public create(data: IBarChartHorizontalDataEntry[]): void {
        const width = this.container.getWidth();
        const height = this.container.getHeight();

        const svg = this.container.getContainer();
        svg.attr('class', 'bar chart horizontal');

        const y = d3.scaleBand().rangeRound([ height, 0 ]).padding(BarChartHorizontal.defaultPadding);
        const x = d3.scaleLinear().range([ BarChartHorizontal.defaultXMargin, width ]);

        y.domain(data.map((d) => d.name));
        x.domain([ 0, d3.max(data.map((d) => d.value)) ]);

        const xAxis = d3.axisBottom(x);
        const yAxis = d3.axisLeft(y);

        svg.append('g')
           .attr('class', 'y axis')
           .call(yAxis)
           .append('text')
           // .attr('y', 6) // tslint:disable-line:no-magic-numbers
           .attr('dx', '2.5em')
           .attr('dy', '-0.4em')
           .text('Frequency');

        svg.append('g')
           .attr('class', 'x axis')
           .attr('transform', `translate(0, ${height})`)
           .call(xAxis);

        const colors = d3.scaleLinear()
                         .domain([ 0, data.length ])
                         .range([ '#48af75', '#3897e0' ] as any);

        svg.selectAll('.bar')
           .data(data)
           .enter().append('rect')
           .attr('class', 'bar')
           .attr('y', (d) => y(d.name))
           .attr('height', y.bandwidth)
           .attr('x', BarChartHorizontal.defaultXMargin)
           .attr('width', (d) => x(d.value))
           .attr('fill', (d, i) => colors(i));
    }

    public update(data: IBarChartHorizontalDataEntry[]): void {
        const width = this.container.getWidth();
        const height = this.container.getHeight();

        const y = d3.scaleBand().rangeRound([ height, 0 ]).padding(BarChartHorizontal.defaultPadding);
        const x = d3.scaleLinear().range([ 0, width ]);

        y.domain(data.map((d) => d.name));
        x.domain([ 0, d3.max(data.map((d) => d.value)) ]);

        const xAxis = d3.axisBottom(x) as any;
        const yAxis = d3.axisLeft(y) as any;

        const svg = this.container.getContainer();

        const bars = svg.selectAll('.bar').data(data);
        const colors = d3.scaleLinear()
                         .domain([ 0, data.length ])
                         .range([ '#48af75', '#3897e0' ] as any);

        bars.exit().remove();
        bars.enter().append('rect')
            .attr('class', 'bar')
            .attr('y', (d) => y(d.name))
            .attr('x', BarChartHorizontal.defaultXMargin)
            .transition().duration(BarChartHorizontal.defaultTransitionDuration)
            .attr('height', y.bandwidth)
            .attr('width', (d) => x(d.value))
            .attr('fill', (d, i) => colors(i));

        bars.transition().duration(BarChartHorizontal.defaultTransitionDuration)
            .attr('y', (d) => y(d.name))
            .attr('height', y.bandwidth)
            .attr('x', BarChartHorizontal.defaultXMargin)
            .attr('width', (d) => x(d.value))
            .attr('fill', (d, i) => colors(i));

        svg.select('.x.axis')
           .transition().duration(BarChartHorizontal.defaultTransitionDuration)
           .call(xAxis);

        svg.select('.y.axis')
           .transition().duration(BarChartHorizontal.defaultTransitionDuration)
           .call(yAxis);
    }

    public updateValues(data: IBarChartHorizontalDataEntry[]): void {
        const x = d3.scaleLinear().range([ 0, this.container.getWidth() ]);

        x.domain([ 0, d3.max(data.map((d) => d.value)) ]);

        const xAxis = d3.axisBottom(x) as any;

        const svg = this.container.getContainer();

        svg.selectAll('.bar').data(data);
        const transition = svg.transition().duration(BarChartHorizontal.defaultTransitionDuration);

        transition.selectAll('.bar')
                  .attr('width', (d: IBarChartHorizontalDataEntry, i) => x(d.value));

        transition.select('.x.axis')
                  .call(xAxis);
    }
}

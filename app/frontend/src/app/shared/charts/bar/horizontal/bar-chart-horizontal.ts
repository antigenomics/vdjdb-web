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

import { ScaleBand, ScaleLinear } from 'd3-scale';
import { event as D3CurrentEvent } from 'd3-selection';
import * as d3 from 'external/d3';
import { Observable } from 'rxjs/Observable';
import { Chart } from 'shared/charts/chart';
import { IChartEvent } from 'shared/charts/chart-events';
import { ChartContainer, D3HTMLSelection } from 'shared/charts/container/chart-container';

export interface IBarChartHorizontalDataEntry {
    readonly name: string;
    readonly value: number;
}

export class BarChartHorizontal extends Chart<IBarChartHorizontalDataEntry> {
    private static readonly defaultTransitionDuration: number = 750;
    private static readonly defaultPadding: number = 0.1;
    private static readonly defaultXMargin: number = 5;

    constructor(container: ChartContainer, dataStream: Observable<IChartEvent<IBarChartHorizontalDataEntry>>) {
        super(container, dataStream);
        this.container.classed('bar chart horizontal');
    }

    public create(data: IBarChartHorizontalDataEntry[]): void {
        const { svg, width, height } = this.container.getContainer();
        const { x, xAxis } = this.createXAxis(width, data.map((d) => d.value));
        const { y, yAxis } = this.createYAxis(height, data.map((d) => d.name));
        const colors = this.getColors(data.length);

        svg.append('g')
           .attr('class', 'y axis')
           .call(yAxis)
           .append('text')
           .attr('dx', '2.5em')
           .attr('dy', '-0.4em')
           .text('Frequency');

        svg.append('g')
           .attr('class', 'x axis')
           .attr('transform', `translate(0, ${height})`)
           .call(xAxis);

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
        const { svg, width, height } = this.container.getContainer();
        const { x, xAxis } = this.createXAxis(width, data.map((d) => d.value));
        const { y, yAxis } = this.createYAxis(height, data.map((d) => d.name));
        const colors = this.getColors(data.length);

        const bars = svg.selectAll('.bar').data(data);

        bars.exit().remove();
        bars.enter().append('rect')
            .attr('class', 'bar')
            .merge(bars)
            .transition().duration(BarChartHorizontal.defaultTransitionDuration)
            .attr('y', (d) => y(d.name))
            .attr('x', BarChartHorizontal.defaultXMargin)
            .attr('height', y.bandwidth)
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
        const { svg, width } = this.container.getContainer();
        const { x, xAxis } = this.createXAxis(width, data.map((d) => d.value));

        svg.selectAll('.bar').data(data)
           .transition().duration(BarChartHorizontal.defaultTransitionDuration)
           .attr('width', (d, i) => x(d.value));

        svg.select('.x.axis')
           .transition().duration(BarChartHorizontal.defaultTransitionDuration)
           .call(xAxis);
    }

    private createXAxis(width: number, values: number[]): { x: ScaleLinear<number, number>, xAxis: any } {
        const x = d3.scaleLinear().range([ 0, width ])
                    .domain([ 0, d3.max(values) ]);
        const xAxis = d3.axisBottom(x);
        return { x, xAxis };
    }

    private createYAxis(height: number, names: string[]): { y: ScaleBand<string>, yAxis: any } {
        const y = d3.scaleBand().rangeRound([ height, 0 ])
                    .padding(BarChartHorizontal.defaultPadding)
                    .domain(names);
        const yAxis = d3.axisLeft(y);
        return { y, yAxis };
    }

    private getColors(count: number): ScaleLinear<number, number> {
        return d3.scaleLinear()
                 .domain([ 0, count ])
                 .range([ '#48af75', '#3897e0' ] as any);
    }
}

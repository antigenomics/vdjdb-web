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

import { NgZone } from '@angular/core';
import { ScaleBand, ScaleLinear } from 'd3-scale';
import { event as D3CurrentEvent } from 'd3-selection';
import * as d3 from 'external/d3';
import { createDefaultBarChartConfiguration, IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { Chart, ChartInputStreamType } from 'shared/charts/chart';
import { ChartUtils } from 'shared/charts/chart-utils';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';
import { Configuration } from 'utils/configuration/configuration';

export class BarChartHorizontal extends Chart<IChartDataEntry, IBarChartConfiguration> {
    private static readonly defaultTransitionDuration: number = 750;
    private static readonly defaultPadding: number = 0.1;
    private static readonly defaultXMargin: number = 5;

    constructor(configuration: IBarChartConfiguration, container: ChartContainer,
                dataStream: ChartInputStreamType, ngZone: NgZone) {
        super(configuration, container, dataStream, ngZone);
        this.container.classed('bar chart horizontal');
    }

    public configure(configuration: IBarChartConfiguration): void {
        this.configuration = createDefaultBarChartConfiguration();
        Configuration.extend(this.configuration, configuration);
    }

    public create(data: IChartDataEntry[]): void {
        const { svg, width, height } = this.container.getContainer();
        const { x, xAxis } = this.createXAxis(width, height, data);
        const { y, yAxis } = this.createYAxis(width, height, data);
        const colors = ChartUtils.Color.generate(data);

        svg.append('g')
           .attr('class', 'y axis')
           .call(yAxis)
           .append('text')
           .attr('dx', this.configuration.axis.y.dx)
           .attr('dy', this.configuration.axis.y.dy)
           .text(this.configuration.axis.y.title);

        svg.append('g')
           .attr('class', 'x axis')
           .attr('transform', `translate(0, ${height})`)
           .call(xAxis);

        const bars = svg.selectAll('.bar')
                        .data(data)
                        .enter().append('rect')
                        .attr('class', 'bar')
                        .attr('y', (d) => y(d.name))
                        .attr('height', y.bandwidth)
                        .attr('x', BarChartHorizontal.defaultXMargin)
                        .attr('width', (d) => x(d.value))
                        .attr('fill', (d) => d.color ? d.color : colors(d.name));

        this.bindTooltipEvents(bars);
    }

    public update(data: IChartDataEntry[]): number {
        const { svg, width, height } = this.container.getContainer();
        const { x, xAxis } = this.createXAxis(width, height, data);
        const { y, yAxis } = this.createYAxis(width, height, data);
        const colors = ChartUtils.Color.generate(data);

        const bars = svg.selectAll('.bar').data(data);

        bars.exit().remove();

        const merged = bars.enter().append('rect')
                           .attr('class', 'bar')
                           .merge(bars);

        merged.transition().duration(BarChartHorizontal.defaultTransitionDuration)
              .attr('y', (d) => y(d.name))
              .attr('x', BarChartHorizontal.defaultXMargin)
              .attr('height', y.bandwidth)
              .attr('width', (d) => x(d.value))
              .attr('fill', (d) => d.color ? d.color : colors(d.name));

        svg.select('.x.axis')
           .transition().duration(BarChartHorizontal.defaultTransitionDuration)
           .call(xAxis);

        svg.select('.y.axis')
           .transition().duration(BarChartHorizontal.defaultTransitionDuration)
           .call(yAxis);

        this.bindTooltipEvents(merged);

        return BarChartHorizontal.defaultTransitionDuration;
    }

    public updateValues(data: IChartDataEntry[]): number {
        const { svg, width, height } = this.container.getContainer();
        const { x, xAxis } = this.createXAxis(width, height, data);

        svg.selectAll('.bar').data(data)
           .transition().duration(BarChartHorizontal.defaultTransitionDuration)
           .attr('width', (d) => x(d.value));

        svg.select('.x.axis')
           .transition().duration(BarChartHorizontal.defaultTransitionDuration)
           .call(xAxis);

        return BarChartHorizontal.defaultTransitionDuration;
    }

    public resize(data: IChartDataEntry[]): number {
        return this.update(data);
    }

    private createXAxis(width: number, height: number, data: IChartDataEntry[]): { x: ScaleLinear<number, number>, xAxis: any } {
        const x = d3.scaleLinear().range([ 0, width ])
                    .domain([ 0, d3.max(data.map((d) => d.value)) ]);
        const xAxis = d3.axisBottom(x);
        if (this.configuration.grid) {
            xAxis.tickSizeInner(-height);
            xAxis.tickSizeOuter(0);
        }
        if (this.configuration.axis.x.tickFormat) {
            xAxis.tickFormat(d3.format(this.configuration.axis.x.tickFormat) as any);
        }
        if (this.configuration.axis.x.ticksCount) {
            xAxis.ticks(this.configuration.axis.x.ticksCount);
        }
        return { x, xAxis };
    }

    private createYAxis(width: number, height: number, data: IChartDataEntry[]): { y: ScaleBand<string>, yAxis: any } {
        const y = d3.scaleBand().rangeRound([ height, 0 ])
                    .padding(BarChartHorizontal.defaultPadding)
                    .domain(data.map((d) => d.name));
        const yAxis = d3.axisLeft(y);
        if (this.configuration.grid) {
            yAxis.tickSizeInner(-width);
            yAxis.tickSizeOuter(0);
        }
        return { y, yAxis };
    }

    private bindTooltipEvents(elements: any): void {
        const xDefaultOffset = 20;
        const yDefaultOffset = -40;

        elements.on('mouseover', (d: IChartDataEntry) => {
            const value = this.configuration.tooltip.value(d);
            this.tooltip.text(d.name, `Value: ${value}`);
            this.tooltip.show();
        }).on('mouseout', () => {
            this.tooltip.hide();
        }).on('mousemove', () => {
            this.tooltip.position(D3CurrentEvent.pageX + xDefaultOffset, D3CurrentEvent.pageY + yDefaultOffset);
        });
    }
}

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
import { ScaleBand, ScaleLinear, ScaleOrdinal } from 'd3-scale';
import * as d3 from 'external/d3';
import { createDefaultBarChartConfiguration, IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { Chart, ChartInputGroupedStreamType } from 'shared/charts/chart';
import { ChartUtils } from 'shared/charts/chart-utils';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';
import { IChartGroupedDataEntry } from 'shared/charts/data/chart-grouped-data-entry';
import { Configuration } from 'utils/configuration/configuration';

interface IGroupRectData {
    data: IChartDataEntry;
    colors: ScaleOrdinal<string, string>;
    x: ScaleBand<string>;
}

export class BarChartGrouped extends Chart<IChartGroupedDataEntry, IBarChartConfiguration> {
    private static readonly defaultTransitionDuration: number = 750;
    private static readonly defaultPadding: number = 0.1;

    constructor(configuration: IBarChartConfiguration, container: ChartContainer,
                dataStream: ChartInputGroupedStreamType, ngZone: NgZone) {
        super(configuration, container, dataStream, ngZone);
        this.container.classed('bar chart grouped');
    }

    public configure(configuration: IBarChartConfiguration): void {
        this.configuration = createDefaultBarChartConfiguration();
        Configuration.extend(this.configuration, configuration);
    }

    public create(data: IChartGroupedDataEntry[]): void {
        const { svg, width, height } = this.container.getContainer();
        const { y, yAxis } = this.createYAxis(width, height, data);
        const { mainX, mainXAxis } = this.createMainXAxis(width, data);

        const groupsAxis = data.map((d) => {
            return { name: d.name, ...this.createGroupXAxis([ 0, mainX.bandwidth() ], d.values) };
        });

        svg.selectAll('g')
           .data(data)
           .enter()
           .append('g')
           .attr('class', 'group')
           .attr('transform', (d) => `translate(${mainX(d.name)},0)`)
           .selectAll('rect')
           .data((d, i) => d.values.map((v) => ({
               data: v, colors: ChartUtils.Color.generate(d.values), x: groupsAxis[ i ].x
           } as IGroupRectData)))
           .enter()
           .append('rect')
           .attr('class', 'bar')
           .attr('x', (d) => d.x(d.data.name))
           .attr('y', (d) => y(d.data.value))
           .attr('width', (d) => d.x.bandwidth())
           .attr('height', (d) => height - y(d.data.value))
           .style('fill', (d) => d.data.color ? d.data.color : d.colors(d.data.name));

        groupsAxis.forEach((axis) => {
            svg.append('g')
               .attr('transform', `translate(${mainX(axis.name)},${height})`)
               .attr('class', 'x axis grouped secondary')
               .call(axis.xAxis)
               .selectAll('text')
               .style('text-anchor', 'end')
               .attr('dx', '-.8em')
               .attr('dy', '.15em')
               .attr('transform', 'rotate(-65)');
        });

        svg.append('g')
           .attr('class', 'y axis')
           .call(yAxis)
           .append('text')
           .attr('dx', this.configuration.axis.y.dx)
           .attr('dy', this.configuration.axis.y.dy)
           .text(this.configuration.axis.y.title);

        svg.append('g')
           .attr('class', 'x axis grouped main')
           .call(mainXAxis as any);
    }

    public update(data: IChartGroupedDataEntry[]): void {
        const { svg, width, height } = this.container.getContainer();
        const { y, yAxis } = this.createYAxis(width, height, data);
        const { mainX, mainXAxis } = this.createMainXAxis(width, data);

        const groupsAxis = data.map((d) => {
            return { name: d.name, ...this.createGroupXAxis([ 0, mainX.bandwidth() ], d.values) };
        });

        const groups = svg.selectAll('g.group').data(data);
        groups.exit().remove();
        groups.enter().append('g')
              .attr('class', 'group')
              .attr('transform', (d) => `translate(${mainX(d.name)},0)`)
              .selectAll('rect')
              .data((d, i) => d.values.map((v) => ({
                  data: v, colors: ChartUtils.Color.generate(d.values), x: groupsAxis[ i ].x
              } as IGroupRectData)))
              .enter()
              .append('rect')
              .attr('class', 'bar')
              .attr('x', (d) => d.x(d.data.name))
              .attr('y', (d) => y(d.data.value))
              .attr('width', (d) => d.x.bandwidth())
              .attr('height', (d) => height - y(d.data.value))
              .style('fill', (d) => d.data.color ? d.data.color : d.colors(d.data.name));

        groups.transition().duration(BarChartGrouped.defaultTransitionDuration)
              .attr('transform', (d) => `translate(${mainX(d.name)},0)`);

        const bars = groups.selectAll('rect')
                           .data((d, i) => d.values.map((v) => ({
                               data: v, colors: ChartUtils.Color.generate(d.values), x: groupsAxis[ i ].x
                           } as IGroupRectData)));

        bars.exit().remove();
        bars.enter().append('rect')
            .attr('class', 'bar')
            .attr('x', (d) => d.x(d.data.name))
            .attr('y', (d) => y(d.data.value))
            .attr('width', (d) => d.x.bandwidth())
            .attr('height', (d) => height - y(d.data.value))
            .style('fill', (d) => d.data.color ? d.data.color : d.colors(d.data.name));

        bars.transition().duration(BarChartGrouped.defaultTransitionDuration)
            .attr('class', 'bar')
            .attr('x', (d) => d.x(d.data.name))
            .attr('y', (d) => y(d.data.value))
            .attr('width', (d) => d.x.bandwidth())
            .attr('height', (d) => height - y(d.data.value))
            .style('fill', (d) => d.data.color ? d.data.color : d.colors(d.data.name));

        svg.selectAll('.x.axis.grouped.secondary').remove();
        groupsAxis.forEach((axis) => {
            svg.append('g')
               .attr('transform', `translate(${mainX(axis.name)},${height})`)
               .transition().duration(BarChartGrouped.defaultTransitionDuration)
               .attr('class', 'x axis grouped secondary')
               .call(axis.xAxis)
               .selectAll('text')
               .style('text-anchor', 'end')
               .attr('dx', '-.8em')
               .attr('dy', '.15em')
               .attr('transform', 'rotate(-65)');
        });

        svg.selectAll('.y.axis')
           .transition().duration(BarChartGrouped.defaultTransitionDuration)
           .call(yAxis);

        svg.selectAll('.x.axis.grouped.main')
           .transition().duration(BarChartGrouped.defaultTransitionDuration)
           .call(mainXAxis);
    }

    public updateValues(data: IChartGroupedDataEntry[]): void {
        this.update(data);
    }

    public resize(data: IChartGroupedDataEntry[]): void {
        this.update(data);
    }

    private createYAxis(width: number, height: number, data: IChartGroupedDataEntry[]): { y: ScaleLinear<number, number>, yAxis: any } {
        const y = d3.scaleLinear()
                    .domain([ 0, d3.max(data, (d) => d3.max(d.values.map((v) => v.value))) ])
                    .range([ height, 0 ]);

        const yAxis = d3.axisLeft(y);
        if (this.configuration.grid) {
            yAxis.tickSizeInner(-width);
            yAxis.tickSizeOuter(0);
        }
        if (this.configuration.axis.y.tickFormat) {
            yAxis.tickFormat(d3.format(this.configuration.axis.y.tickFormat) as any);
        }
        if (this.configuration.axis.y.ticksCount) {
            yAxis.ticks(this.configuration.axis.y.ticksCount);
        }
        return { y, yAxis };
    }

    private createMainXAxis(width: number, data: IChartGroupedDataEntry[]): { mainX: ScaleBand<string>, mainXAxis: any } {
        const mainX = d3.scaleBand().domain(data.map((d) => d.name)).padding(BarChartGrouped.defaultPadding).range([ 0, width ]);
        const mainXAxis = d3.axisTop(mainX);
        return { mainX, mainXAxis };
    }

    private createGroupXAxis(range: [ number, number ], data: IChartDataEntry[]): { x: ScaleBand<string>, xAxis: any } {
        const x = d3.scaleBand().domain(data.map((d) => d.name))
                    .padding(BarChartGrouped.defaultPadding).rangeRound(range);
        const xAxis = d3.axisBottom(x);
        if (this.configuration.axis.x.tickFormat) {
            xAxis.tickFormat(d3.format(this.configuration.axis.x.tickFormat) as any);
        }
        if (this.configuration.axis.x.ticksCount) {
            xAxis.ticks(this.configuration.axis.x.ticksCount);
        }
        return { x, xAxis };
    }
}

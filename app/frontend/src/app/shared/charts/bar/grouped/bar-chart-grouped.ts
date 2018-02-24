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
import { BaseType, event as D3CurrentEvent } from 'd3-selection';
import * as d3 from 'external/d3';
import { createDefaultBarChartConfiguration, IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { Chart, ChartInputGroupedStreamType } from 'shared/charts/chart';
import { ChartUtils } from 'shared/charts/chart-utils';
import { ChartContainer, D3HTMLSelection } from 'shared/charts/container/chart-container';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';
import { IChartGroupedDataEntry } from 'shared/charts/data/chart-grouped-data-entry';
import { Configuration } from 'utils/configuration/configuration';

interface IGroupBarData {
    name: string;
    data: IChartDataEntry;
    colors: ScaleOrdinal<string, string>;
    x: ScaleBand<string>;
}

interface IGroupAxisType {
    name: string;
    x: ScaleBand<string>;
    xAxis: any;
}

type GroupsSelectionType = d3.Selection<BaseType, IChartGroupedDataEntry, BaseType, any>;
type GroupsTransitionType = d3.Transition<BaseType, IChartGroupedDataEntry, BaseType, any>;

type BarsSelectionType = d3.Selection<BaseType, IGroupBarData, BaseType, IChartGroupedDataEntry>;
type BarsTransitionType = d3.Transition<BaseType, IGroupBarData, BaseType, IChartGroupedDataEntry>;

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

        const groupsAxis = this.createGroupsXAxis(mainX, data);

        const enterGroups = svg.selectAll('g').data(data).enter().append('g');
        this.setGroupAttributes(mainX, enterGroups);

        const bars = this.appendBarsDataToGroups(enterGroups, groupsAxis);
        const enterBars = bars.enter().append('rect');
        this.setBarAttributes(height, y, enterBars);

        this.recreateGroupsAxis(svg, height, mainX, groupsAxis);

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

        this.bindTooltipEvents(enterBars);
    }

    public update(data: IChartGroupedDataEntry[]): void {
        const { svg, width, height } = this.container.getContainer();
        const { y, yAxis } = this.createYAxis(width, height, data);
        const { mainX, mainXAxis } = this.createMainXAxis(width, data);

        const groupsAxis = this.createGroupsXAxis(mainX, data);
        const groups = svg.selectAll('g.group').data(data);

        /* Creating new groups */
        const enterGroups = groups.enter().append('g');
        this.setGroupAttributes(mainX, enterGroups);

        /* Creating bars for new groups */
        const enterGroupsBars = this.appendBarsDataToGroups(enterGroups, groupsAxis);
        const enterGroupsEnterBars = enterGroupsBars.enter().append('rect');
        this.bindTooltipEvents(enterGroupsEnterBars);
        this.setBarAttributes(height, y, enterGroupsEnterBars);

        /* Animating old groups */
        const transitionGroups = groups.transition().duration(BarChartGrouped.defaultTransitionDuration);
        this.setGroupAttributes(mainX, transitionGroups);

        const bars = this.appendBarsDataToGroups(groups, groupsAxis);

        /* Creating new bars for old groups */
        const enterBars = bars.enter().append('rect');
        this.bindTooltipEvents(enterBars);
        this.setBarAttributes(height, y, enterBars);

        /* Animating old bars for old groups */
        const transitionBars = bars.transition().duration(BarChartGrouped.defaultTransitionDuration);
        this.setBarAttributes(height, y, transitionBars);

        /* Recreating per groups axis */
        this.recreateGroupsAxis(svg, height, mainX, groupsAxis);

        svg.selectAll('.y.axis')
           .transition().duration(BarChartGrouped.defaultTransitionDuration)
           .call(yAxis);

        svg.selectAll('.x.axis.grouped.main')
           .transition().duration(BarChartGrouped.defaultTransitionDuration)
           .call(mainXAxis);

        groups.exit().remove();
        bars.exit().remove();
    }

    public updateValues(data: IChartGroupedDataEntry[]): void {
        this.update(data);
    }

    public resize(data: IChartGroupedDataEntry[]): void {
        this.update(data);
    }

    private recreateGroupsAxis(svg: D3HTMLSelection, height: number, mainX: ScaleBand<string>, groupsAxis: IGroupAxisType[]): void {
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
    }

    private appendBarsDataToGroups(groups: any, groupsAxis: IGroupAxisType[]): BarsSelectionType {
        return groups.selectAll('rect')
                     .data((d: IChartGroupedDataEntry, i: number) => d.values.map((v) => ({
                         name: d.name, data: v, colors: ChartUtils.Color.generate(d.values), x: groupsAxis[ i ].x
                     } as IGroupBarData)));
    }

    private setBarAttributes(height: number, y: ScaleLinear<number, number>, bars: BarsSelectionType | BarsTransitionType): void {
        bars.attr('class', 'bar')
            .attr('x', (d) => d.x(d.data.name))
            .attr('y', (d) => y(d.data.value))
            .attr('width', (d) => d.x.bandwidth())
            .attr('height', (d) => height - y(d.data.value))
            .style('fill', (d) => d.data.color ? d.data.color : d.colors(d.data.name));
    }

    private setGroupAttributes(mainX: ScaleBand<string>, groups: GroupsSelectionType | GroupsTransitionType): void {
        groups.attr('class', 'group')
              .attr('transform', (d) => `translate(${mainX(d.name)},0)`);
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

    private createGroupsXAxis(mainX: ScaleBand<string>, data: IChartGroupedDataEntry[]): IGroupAxisType[] {
        return data.map((d) => {
            return { name: d.name, ...this.createGroupXAxis([ 0, mainX.bandwidth() ], d.values) };
        });
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

    private bindTooltipEvents(elements: BarsSelectionType): void {
        const xDefaultOffset = 20;
        const yDefaultOffset = -40;

        elements.on('mouseover', (d: IGroupBarData) => {
            const value = this.configuration.tooltip.value(d.data);
            this.tooltip.text(`${d.data.name}   (${d.name})`, `Value: ${value}`);
            this.tooltip.show();
        }).on('mouseout', () => {
            this.tooltip.hide();
        }).on('mousemove', () => {
            this.tooltip.position(D3CurrentEvent.pageX + xDefaultOffset, D3CurrentEvent.pageY + yDefaultOffset);
        });
    }
}

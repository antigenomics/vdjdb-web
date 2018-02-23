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
import { keys } from 'd3-collection';
import * as d3 from 'external/d3';
import { createDefaultBarChartConfiguration, IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { Chart, ChartInputGroupedStreamType } from 'shared/charts/chart';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { IChartGroupedDataEntry } from 'shared/charts/data/chart-grouped-data-entry';
import { Configuration } from 'utils/configuration/configuration';

export class BarChartGrouped extends Chart<IChartGroupedDataEntry, IBarChartConfiguration> {

    constructor(configuration: IBarChartConfiguration, container: ChartContainer,
                dataStream: ChartInputGroupedStreamType, ngZone: NgZone) {
        super(configuration, container, dataStream, ngZone);
        this.container.classed('bar chart horizontal');
    }

    public configure(configuration: IBarChartConfiguration): void {
        this.configuration = createDefaultBarChartConfiguration();
        Configuration.extend(this.configuration, configuration);
    }

    public create(data: IChartGroupedDataEntry[]): void {
        const { svg, width, height } = this.container.getContainer();

        const y = d3.scaleLinear()
                    .domain([ 0, d3.max(data, (d) => d3.max(d.values)) ])
                    .range([ height, 0 ]);

        const x0 = d3.scaleBand()
                     .domain(data.map((d) => d.name))
                     .padding(0.1)
                     .range([ 0, width ]);

        const x1 = d3.scaleBand()
                     .domain(d3.range(data[ 0 ].values.length) as any)
                     .padding(0.1)
                     .rangeRound([ 0, x0.bandwidth() ]);

        const z = d3.scaleOrdinal()
                    .range([ '#98abc5', '#8a89a6', '#7b6888', '#6b486b', '#a05d56', '#d0743c', '#ff8c00' ]);

        svg.append('g')
           .selectAll('g')
           .data(data)
           .enter().append('g')
           .attr('transform', function(d) {
               return 'translate(' + x0(d.name) + ',0)';
           })
           .selectAll('rect')
           .data(function(d) {
               return d3.range(data[ 0 ].values.length).map(function(key) {
                   return { key, value: d.values[ key ] };
               });
           })
           .enter().append('rect')
           .attr('x', function(d) {
               return x1(d.key);
           })
           .attr('y', function(d) {
               return y(d.value);
           })
           .attr('width', x1.bandwidth())
           .attr('height', function(d) {
               return height - y(d.value);
           })
           .style('fill', (d, i) => z(i));

        svg.append('g')
           .attr('class', 'axis')
           .attr('transform', 'translate(0,' + height + ')')
           .call(d3.axisBottom(x0));

        svg.append('g')
           .attr('class', 'axis')
           .call(d3.axisLeft(y).ticks(null, 's'))
           .append('text')
           .attr('x', 2)
           .attr('y', y(y.ticks().pop()) + 0.5)
           .attr('dy', '0.32em')
           .attr('fill', '#000')
           .attr('font-weight', 'bold')
           .attr('text-anchor', 'start')
           .text('Test data');
    }

    public update(_data: IChartGroupedDataEntry[]): void {
        throw new Error('Not implemented');
    }

    public updateValues(_data: IChartGroupedDataEntry[]): void {
        throw new Error('Not implemented');
    }

    public resize(_data: IChartGroupedDataEntry[]): void {
        throw new Error('Not implemented');
    }
}

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

import { ScaleBand, ScaleContinuousNumeric } from 'd3-scale';
import * as d3 from 'external/d3';
import { createDefaultBarChartConfiguration, IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { ChartContainer, D3HTMLSelection, D3MultipleDataSelection } from 'shared/charts/container/chart-container';
import { Configuration } from 'utils/configuration/configuration';

export interface BarChartDataEntry {
    readonly domain: string;
    readonly value: number;
}

export class BarChart {
    private configuration: IBarChartConfiguration = createDefaultBarChartConfiguration();

    private domainAxis: ScaleBand<string>;
    private domainAxisWidth: number;
    private domainAxisComponent: D3HTMLSelection;

    private valuesAxisComponent: D3HTMLSelection;
    private valuesAxisWidth: number;
    private valuesAxis: ScaleContinuousNumeric<number, number>;

    private barsComponent: D3MultipleDataSelection<BarChartDataEntry>;

    constructor(private container: ChartContainer) {
    }

    public update(data: BarChartDataEntry[]): void {
        console.log('not implemented')
    }

    public create(data: BarChartDataEntry[], config?: IBarChartConfiguration): void {
        Configuration.extend(this.configuration, config);

        this.domainAxisWidth = this.configuration.type === 'horizontal' ? this.container.getHeight() : this.container.getWidth();
        this.valuesAxisWidth = this.configuration.type === 'horizontal' ? this.container.getWidth() : this.container.getHeight();

        this.domainAxis = d3.scaleBand().rangeRound((() => {
            if (this.configuration.type === 'horizontal') {
                return [ this.domainAxisWidth, 0 ];
            }
            return [ 0, this.domainAxisWidth ];
        })() as [ number, number ]).padding(this.configuration.padding);

        this.valuesAxis = d3.scaleLinear().range((() => {
            if (this.configuration.type === 'horizontal') {
                return [ 5, this.valuesAxisWidth ];
            }
            return [ this.valuesAxisWidth, 5 ];
        })());

        this.domainAxis.domain(data.map((d) => d.domain));
        this.valuesAxis.domain([ 0, d3.max(data.map((d) => d.value)) ]);

        switch (this.configuration.type) {
            case 'bar':
                this.createBarChart(data);
                break;
            case 'horizontal':
                this.createHorizontalBarChart(data);
                break;
            default:
                throw new Error(`Undefined bar chart type: ${this.configuration.type}`);
        }
    }

    private createBarChart(data: BarChartDataEntry[]): void {
        const svg = this.container.getContainer();
        svg.attr('class', 'bar chart');

        const xAxis = d3.axisBottom(this.domainAxis);
        const yAxis = d3.axisLeft(this.valuesAxis);

        this.domainAxisComponent =
            svg.append('g')
               .attr('class', 'x axis')
               .attr('transform', `translate(0, ${this.valuesAxisWidth})`)
               .call(xAxis);

        this.valuesAxisComponent =
            svg.append('g')
               .attr('class', 'y axis')
               .call(yAxis)
               .append('text')
               .attr('transform', 'rotate(-90)')
               .attr('y', 6)
               .attr('dy', '.71em')
               .style('text-anchor', 'end')
               .text('Frequency');

        this.barsComponent =
            svg.selectAll('.bar')
               .data(data)
               .enter().append('rect')
               .attr('class', 'bar')
               .attr('x', (d) => this.domainAxis(d.domain))
               .attr('width', this.domainAxis.bandwidth)
               .attr('y', (d) => this.valuesAxis(d.value) - 5)
               .attr('height', (d) => this.valuesAxisWidth - this.valuesAxis(d.value));
    }

    private createHorizontalBarChart(data: BarChartDataEntry[]): void {
        const svg = this.container.getContainer();
        svg.attr('class', 'bar chart horizontal');

        const xAxis = d3.axisBottom(this.valuesAxis);
        const yAxis = d3.axisLeft(this.domainAxis);

        this.domainAxisComponent =
            svg.append('g')
               .attr('class', 'y axis')
               .call(yAxis)
               .append('text')
               .attr('transform', 'rotate(-90)')
               .attr('y', 6)
               .attr('dy', '.71em')
               .style('text-anchor', 'end')
               .text('Frequency');

        this.valuesAxisComponent =
            svg.append('g')
               .attr('class', 'x axis')
               .attr('transform', `translate(0, ${this.domainAxisWidth})`)
               .call(xAxis);

        this.barsComponent =
            svg.selectAll('.bar')
               .data(data)
               .enter().append('rect')
               .attr('class', 'bar')
               .attr('y', (d) => this.domainAxis(d.domain))
               .attr('height', this.domainAxis.bandwidth)
               .attr('x', 5)
               .attr('width', (d) => this.valuesAxis(d.value));
    }
}
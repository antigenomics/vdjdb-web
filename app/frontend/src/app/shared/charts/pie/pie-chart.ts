/*
 *      Copyright 2017 Bagaev Dmitry
 *
 *      Licensed under the Apache License, Version 2.0 (the "License");
 *      you may not use this file except in compliance with the License.
 *      You may obtain a copy of the License at
 *
 *          http://www.apache.org/licenses/LICENSE-2.0
 *
 *      Unless required by applicable law or agreed to in writing, software
 *      distributed under the License is distributed on an "AS IS" BASIS,
 *      WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *      See the License for the specific language governing permissions and
 *      limitations under the License.
 */

import { NgZone } from '@angular/core';
import * as d3 from 'external/d3';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Chart } from 'shared/charts/chart';
import { IChartEvent } from 'shared/charts/chart-events';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';
import { createDefaultPieChartConfiguration, IPieChartConfiguration } from 'shared/charts/pie/pie-chart-configuration';
import { Configuration } from 'utils/configuration/configuration';

export type PieChartStreamType = Subject<IChartEvent<IChartDataEntry>>;
export type PieChartInputStreamType = Observable<IChartEvent<IChartDataEntry>>;

export class PieChart extends Chart<IChartDataEntry, IPieChartConfiguration> {
    private static readonly ARC_OUTER_RADIUS_SHIFT: number = 10;
    private static readonly ARC_INNER_RADIUS_COEFF: number = 4.0;

    constructor(configuration: IPieChartConfiguration, container: ChartContainer,
                dataStream: PieChartInputStreamType, ngZone: NgZone) {
        super(configuration, container, dataStream, ngZone);
        this.container.classed('pie chart');
    }

    public configure(configuration: IPieChartConfiguration): void {
        this.configuration = createDefaultPieChartConfiguration();
        Configuration.extend(this.configuration, configuration);
    }

    public create(data: IChartDataEntry[]): void {
        const { svg, width, height } = this.container.getContainer();
        const radius = Math.min(width, height) / 2;

        const pie = d3.pie<IChartDataEntry>().value((d: IChartDataEntry) => d.value)(data);

        const arc = d3.arc()
                      .outerRadius(radius - PieChart.ARC_OUTER_RADIUS_SHIFT)
                      .innerRadius(radius / PieChart.ARC_INNER_RADIUS_COEFF) as any;

        const center = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);

        const arcs = center.selectAll('.arc')
                           .data(pie)
                           .enter()
                           .append('g')
                           .attr('class', 'arc');

        // const colors = this.getLinearColors(data.length);
        const colors = this.getRainbowColors(data.length);

        arcs.append('path')
            .attr('d', arc)
            .style('fill', (_, i) => (colors(i)));
    }

    public update(data: IChartDataEntry[]): void {
        const { svg } = this.container.getContainer();
        svg.selectAll('g').remove();
        this.create(data);
    }

    public updateValues(data: IChartDataEntry[]): void {
        const { svg, width, height } = this.container.getContainer();
        const radius = Math.min(width, height) / 2;

        const pie = d3.pie<IChartDataEntry>().value((d: IChartDataEntry) => d.value)(data);

        const arc = d3.arc()
                      .outerRadius(radius - PieChart.ARC_OUTER_RADIUS_SHIFT)
                      .innerRadius(radius / PieChart.ARC_INNER_RADIUS_COEFF) as any;

        svg.selectAll('arc').data(pie).selectAll('path').attr('d', arc);
    }

    public resize(_data: IChartDataEntry[]): void {
        throw new Error('Not implemented');
    }
}

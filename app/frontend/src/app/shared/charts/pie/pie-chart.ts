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

// import * as d3 from 'external/d3';
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

    constructor(configuration: IPieChartConfiguration, container: ChartContainer, dataStream: PieChartInputStreamType) {
        super(configuration, container, dataStream);
        this.container.classed('pie chart');
    }

    public configure(configuration: IPieChartConfiguration): void {
        this.configuration = createDefaultPieChartConfiguration();
        Configuration.extend(this.configuration, configuration);
    }

    public create(_data: IChartDataEntry[]): void {
        // const { svg, width, height } = this.container.getContainer();
        // const radius = Math.min(width, height) / 2;
        //
        // const pie = d3.pie<IChartDataEntry>().value((d: IChartDataEntry) => d.value)(data);
        //
        // const _arc = d3.arc()
        //     .outerRadius(radius - 10)
        //     .innerRadius(0) as any;
        //
        // const center = svg.append('g').attr('transform', `translate(${width / 2}, ${height / 2})`);
        // const _arcs = center.selectAll('arc')
        //                    .data(pie)
        //                    .enter().append('g')
        //                    .attr('class', 'arc');
        //
        // const _color = d3.scaleOrdinal()
        //     .range(['#2C93E8', '#838690', '#F56C4E']);

        // arcs.append('path')
        //     .attr('d', arc)
        //     .style('fill', (_d, i) => (color(i.toString())));
        throw new Error('Not implemented');
    }

    public update(_data: IChartDataEntry[]): void {
        throw new Error('Not implemented');
    }

    public updateValues(_data: IChartDataEntry[]): void {
        throw new Error('Not implemented');
    }

    public resize(_data: IChartDataEntry[]): void {
        throw new Error('Not implemented');
    }
}

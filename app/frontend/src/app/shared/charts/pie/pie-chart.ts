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
import { Arc, PieArcDatum } from 'd3-shape';
import * as d3 from 'external/d3';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { Chart } from 'shared/charts/chart';
import { IChartEvent } from 'shared/charts/chart-events';
import { ChartUtils } from 'shared/charts/chart-utils';
import { ChartContainer, D3HTMLSelection } from 'shared/charts/container/chart-container';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';
import { createDefaultPieChartConfiguration, IPieChartConfiguration } from 'shared/charts/pie/pie-chart-configuration';
import { Configuration } from 'utils/configuration/configuration';

export type PieChartStreamType = Subject<IChartEvent<IChartDataEntry>>;
export type PieChartInputStreamType = Observable<IChartEvent<IChartDataEntry>>;

export class PieChart extends Chart<IChartDataEntry, IPieChartConfiguration> {
    private static readonly ARC_ANIMATION_DURATION: number = 750;
    private static readonly ARC_OUTER_RADIUS_SHIFT: number = 0;
    private static readonly ARC_INNER_RADIUS_COEFF: number = 3;
    private static readonly pie = d3.pie<IChartDataEntry>().value((d: IChartDataEntry) => d.value);

    private arc: Arc<any, PieArcDatum<IChartDataEntry>>;
    private path: D3HTMLSelection;

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

        this.arc = d3.arc()
                     .outerRadius(radius - PieChart.ARC_OUTER_RADIUS_SHIFT)
                     .innerRadius(radius / PieChart.ARC_INNER_RADIUS_COEFF) as any;

        const center = svg.append('g')
                          .attr('class', 'center')
                          .attr('transform', `translate(${width / 2}, ${height / 2})`);

        const colors = ChartUtils.Color.generate(data);

        this.path = center.selectAll('path')
                          .data(PieChart.pie(data))
                          .enter()
                          .append('path')
                          .attr('d', this.arc)
                          .attr('class', 'arc')
                          .style('fill', (d) => (colors(d.data.name)));
    }

    public update(data: IChartDataEntry[]): void {
        const old = this.path.data();
        this.path = this.path.data(PieChart.pie(data));

        let index = 0;
        this.path.transition().duration(PieChart.ARC_ANIMATION_DURATION).attrTween('d', (d: any) => {
            const interpolate = d3.interpolate(old[ index++ ], d);
            return (t: any) => {
                return this.arc(interpolate(t));
            };
        });

        const colors = ChartUtils.Color.generate(data);
        this.path.enter()
            .append('path')
            .attr('d', this.arc)
            .attr('class', 'arc')
            .style('fill', (d) => (colors(d.data.name)));

        this.path.exit().remove();
    }

    public updateValues(data: IChartDataEntry[]): void {
        const old = this.path.data();
        this.path = this.path.data(PieChart.pie(data));

        let index = 0;
        this.path.transition().duration(PieChart.ARC_ANIMATION_DURATION).attrTween('d', (d: any) => {
            const interpolate = d3.interpolate(old[ index++ ], d);
            return (t: any) => {
                return this.arc(interpolate(t));
            };
        });
    }

    public resize(_data: IChartDataEntry[]): void {
        throw new Error('Not implemented');
    }
}

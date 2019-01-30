/*
 *     Copyright 2017-2019 Bagaev Dmitry
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
 */

import { NgZone } from '@angular/core';
import { event as D3CurrentEvent } from 'd3-selection';
import { Arc, PieArcDatum } from 'd3-shape';
import * as d3 from 'external/d3';
import { Chart, ChartInputStreamType } from 'shared/charts/chart';
import { ChartUtils } from 'shared/charts/chart-utils';
import { ChartContainer, D3HTMLSelection } from 'shared/charts/container/chart-container';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';
import { createDefaultPieChartConfiguration, IPieChartConfiguration } from 'shared/charts/pie/pie-chart-configuration';
import { Configuration } from 'utils/configuration/configuration';

export class PieChart extends Chart<IChartDataEntry, IPieChartConfiguration> {
    private static readonly ARC_ANIMATION_DURATION: number = 750;
    private static readonly ARC_PIE_OUTER_RADIUS_COEFF: number = 0.7;
    private static readonly ARC_PIE_INNER_RADIUS_COEFF: number = 0.3;
    private static readonly ARC_LABEL_RADIUS_COEFF: number = 0.75;
    private static readonly ARC_LABEL_TEXT_RADIUS_COEFF: number = 0.8;
    private static readonly pie = d3.pie<IChartDataEntry>().value((d: IChartDataEntry) => d.value);

    private pieArc: Arc<any, PieArcDatum<IChartDataEntry>>;
    private labelArc: Arc<any, PieArcDatum<IChartDataEntry>>;
    private pieChart: D3HTMLSelection;
    private pieTextLabels: D3HTMLSelection;
    private pieLineLabels: D3HTMLSelection;

    constructor(configuration: IPieChartConfiguration, container: ChartContainer,
                dataStream: ChartInputStreamType, ngZone: NgZone) {
        super(configuration, container, dataStream, ngZone);
        this.container.classed('pie chart');
        this.container.styled('overflow', 'visible');
    }

    public configure(configuration: IPieChartConfiguration): void {
        this.configuration = createDefaultPieChartConfiguration();
        Configuration.extend(this.configuration, configuration);
    }

    public create(data: IChartDataEntry[]): void {
        const { svg, width, height } = this.container.getContainer();
        const radius = Math.min(width, height) / 2;

        this.pieArc = d3.arc()
            .outerRadius(radius * PieChart.ARC_PIE_OUTER_RADIUS_COEFF)
            .innerRadius(radius * PieChart.ARC_PIE_INNER_RADIUS_COEFF) as any;

        this.labelArc = d3.arc()
            .outerRadius(radius * PieChart.ARC_LABEL_RADIUS_COEFF)
            .innerRadius(radius * PieChart.ARC_LABEL_RADIUS_COEFF) as any;

        this.pieChart = svg.append('g')
            .attr('class', 'center')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        const colors = ChartUtils.Color.generate(data);
        const pieData = PieChart.pie(data);

        this.createPaths(pieData, colors);

        this.pieTextLabels = this.pieChart.append('g').attr('class', 'labels');
        this.createTextLabels(radius, pieData);

        this.pieLineLabels = this.pieChart.append('g').attr('class', 'lines');
        this.createLineLabels(radius, pieData);
    }

    public update(data: IChartDataEntry[]): void {
        const { width, height } = this.container.getContainer();
        const radius = Math.min(width, height) / 2;
        const oldData = this.pieChart.selectAll('path').data();
        const newData = PieChart.pie(data);
        const colors = ChartUtils.Color.generate(data);

        this.updatePaths(oldData, newData, colors);
        this.createPaths(newData, colors);

        this.updateTextLabels(radius, oldData, newData);
        this.createTextLabels(radius, newData);

        this.updateLineLabels(radius, oldData, newData);
        this.createLineLabels(radius, newData);
    }

    public updateValues(data: IChartDataEntry[]): void {
        const { width, height } = this.container.getContainer();
        const radius = Math.min(width, height) / 2;
        const oldData = this.pieChart.selectAll('path').data();
        const newData = PieChart.pie(data);
        const colors = ChartUtils.Color.generate(data);

        this.updatePaths(oldData, newData, colors);
        this.updateTextLabels(radius, oldData, newData);
        this.updateLineLabels(radius, oldData, newData);
    }

    public resize(data: IChartDataEntry[]): void {
        const { svg } = this.container.getContainer();
        svg.selectAll('g').remove();
        this.create(data);
    }

    private createPaths(newData: any[], colors: (s: any) => any): void {
        const paths = this.pieChart.selectAll('path').data(newData, PieChart.key);
        paths.exit().remove();
        const newPaths = paths.enter()
            .append('path')
            .attr('d', this.pieArc)
            .attr('class', 'arc')
            .style('fill', (d) => d.data.color !== undefined ? d.data.color : (colors(d.data.name)));

        this.bindTooltipEvents(newPaths.merge(paths as any));
    }

    private updatePaths(oldData: any[], newData: any[], colors: (s: any) => any): void {
        const paths = this.pieChart.selectAll('path').data(newData, PieChart.key);
        let index = 0;
        paths.transition().duration(PieChart.ARC_ANIMATION_DURATION).attrTween('d', (d: any) => {
            const interpolate = d3.interpolate(oldData[ index++ ], d);
            return (t: any) => {
                return this.pieArc(interpolate(t));
            };
        }).attr('fill', (d) => d.data.color !== undefined ? d.data.color : (colors(d.data.name)));
    }

    private createTextLabels(radius: number, newData: any[]): void {
        const labels = this.pieTextLabels.selectAll('text').data(newData, PieChart.key);
        labels.exit().remove();
        labels.enter()
            .append('text')
            .attr('dy', '.35em')
            .text((d) => {
                return d.data.name;
            })
            .attr('transform', (d) => {
                const position = this.labelArc.centroid(d);
                position[ 0 ] = radius * PieChart.ARC_LABEL_TEXT_RADIUS_COEFF * PieChart.checkMidAngle(d);
                return `translate(${position})`;
            })
            .attr('text-anchor', (d) => {
                return PieChart.checkMidAngle(d) === 1 ? 'start' : 'end';
            });
    }

    private updateTextLabels(radius: number, oldData: any[], newData: any[]): void {
        const labels = this.pieTextLabels.selectAll('text').data(newData, PieChart.key).text((d) => {
            return d.data.name;
        });
        let index1 = 0;
        let index2 = 0;
        labels.transition().duration(PieChart.ARC_ANIMATION_DURATION)
            .attrTween('transform', (d: any) => {
                const interpolate = d3.interpolate(oldData[ index1++ ], d);
                return (t: any) => {
                    const d2 = interpolate(t);
                    const position = this.labelArc.centroid(d2);
                    position[ 0 ] = radius * PieChart.ARC_LABEL_TEXT_RADIUS_COEFF * PieChart.checkMidAngle(d);
                    return `translate(${position})`;
                };
            })
            .styleTween('text-anchor', (d) => {
                const interpolate = d3.interpolate(oldData[ index2++ ], d);
                return (t) => {
                    return PieChart.checkMidAngle(interpolate(t)) === 1 ? 'start' : 'end';
                };
            });
    }

    private createLineLabels(radius: number, newData: any[]): void {
        const lines = this.pieLineLabels.selectAll('polyline').data(newData, PieChart.key);
        lines.exit().remove();
        lines.enter()
            .append('polyline')
            .attr('points', (d) => {
                const position = this.labelArc.centroid(d);
                position[ 0 ] = radius * PieChart.ARC_LABEL_RADIUS_COEFF * PieChart.checkMidAngle(d);
                return [ this.pieArc.centroid(d), this.labelArc.centroid(d), position ] as any;
            });
    }

    private updateLineLabels(radius: number, oldData: any[], newData: any[]): void {
        const lines = this.pieLineLabels.selectAll('polyline').data(newData, PieChart.key);
        let index = 0;
        lines.transition().duration(PieChart.ARC_ANIMATION_DURATION)
            .attrTween('points', (d: any) => {
                const interpolate = d3.interpolate(oldData[ index++ ], d);
                return (t: any) => {
                    const d2 = interpolate(t);
                    const position = this.labelArc.centroid(d2);
                    position[ 0 ] = radius * PieChart.ARC_LABEL_RADIUS_COEFF * PieChart.checkMidAngle(d);
                    return [ this.pieArc.centroid(d2), this.labelArc.centroid(d2), position ] as any;
                };
            });
    }

    private bindTooltipEvents(elements: any): void {
        const xDefaultOffset = 20;
        const yDefaultOffset = -40;

        elements.on('mouseover', (d: PieArcDatum<IChartDataEntry>) => {
            const value = this.configuration.tooltip.value(d.data);
            this.tooltip.text(d.data.name, `Value: ${value}`);
            this.tooltip.show();
        }).on('mouseout', () => {
            this.tooltip.hide();
        }).on('mousemove', () => {
            this.tooltip.position(D3CurrentEvent.pageX + xDefaultOffset, D3CurrentEvent.pageY + yDefaultOffset);
        });
    }

    private static key(d: PieArcDatum<IChartDataEntry>): string {
        return d.data.name;
    }

    private static checkMidAngle(d: PieArcDatum<IChartDataEntry>): number {
        return (d.startAngle + (d.endAngle - d.startAngle) / 2) < Math.PI ? 1 : -1;
    }
}

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

import { ElementRef, Input } from '@angular/core';
import * as d3 from 'external/d3';
import { ChartMarginConfiguration, IChartMarginConfiguration } from 'shared/charts/configuration/chart-margin-configuration';
import { SVGContainer, ISVGContainerConfiguration } from 'shared/charts/svg/svg-container';

export class ChartComponent {
    protected margin: ChartMarginConfiguration = new ChartMarginConfiguration({});

    @Input('margin')
    set setMargin(margin: IChartMarginConfiguration) {
        this.margin = new ChartMarginConfiguration(margin);
    }

    protected createSVGContainer(elementRef: ElementRef, configuration?: ISVGContainerConfiguration): SVGContainer {
        const native = elementRef.nativeElement;
        const width = native.clientWidth - this.margin.right;
        const height = native.clientHeight - this.margin.bottom;
        const svg = d3.select(native)
                      .append('svg')
                      .attr('width', width)
                      .attr('height', height);

        if (configuration && configuration.backgroundFill) {
            svg.append('rect')
               .attr('width', width)
               .attr('height', height)
               .attr('x', 0)
               .attr('x', 0)
               .style('fill', configuration.backgroundFill);
        }

        const container = svg.append('g').attr('transform', `translate(${this.margin.left},${this.margin.top})`);
        return new SVGContainer(container, width - this.margin.left, height - this.margin.top);
    }
}

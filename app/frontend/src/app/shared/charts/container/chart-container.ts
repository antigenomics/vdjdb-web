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

import { ElementRef } from '@angular/core';
import * as d3 from 'external/d3';
import { createDefaultChartContainerConfiguration, IChartContainerConfiguration } from 'shared/charts/container/chart-container-configuration';
import { Configuration } from 'utils/configuration/configuration';

export type D3HTMLSelection = d3.Selection<d3.BaseType, any, any, any>;
export type D3MultipleDataSelection<T> = d3.Selection<d3.BaseType, T, any, any>

export class ChartContainer {
    private readonly _configuration: IChartContainerConfiguration;
    private readonly _container: D3HTMLSelection;
    private readonly _width: number;
    private readonly _height: number;

    constructor(element: ElementRef, configuration?: IChartContainerConfiguration) {
        this._configuration = createDefaultChartContainerConfiguration();
        Configuration.extend(this._configuration, configuration);

        const native = element.nativeElement;
        const margin = this._configuration.margin;
        const width = (this._configuration.width ? this._configuration.width : native.clientWidth) - margin.left - margin.right;
        const height = (this._configuration.height ? this._configuration.height : native.clientHeight) - margin.top - margin.bottom;

        const svg = d3.select(native)
                      .append('svg')
                      .attr('width', width + margin.left + margin.right)
                      .attr('height', height + margin.top + margin.bottom);

        this._container = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        this._width = width;
        this._height = height;
    }

    public getContainer(): D3HTMLSelection {
        return this._container;
    }

    public getWidth(): number {
        return this._width;
    }

    public getHeight(): number {
        return this._height;
    }
}
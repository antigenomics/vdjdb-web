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
export type D3MultipleDataSelection<T> = d3.Selection<d3.BaseType, T, any, any>;

export class ChartContainer {
    private static readonly customInMemoryElementName: string = 'custom';

    private readonly _configuration: IChartContainerConfiguration;
    private readonly _container: D3HTMLSelection;
    private readonly _svg: D3HTMLSelection;
    private _width: number;
    private _height: number;

    constructor(private readonly element: ElementRef, configuration?: IChartContainerConfiguration) {
        this._configuration = createDefaultChartContainerConfiguration();
        Configuration.extend(this._configuration, configuration);

        const margin = this._configuration.margin;
        if (configuration.canvas) {
            const custom = document.createElement(ChartContainer.customInMemoryElementName);
            this._container = d3.select(element.nativeElement).append('div')
                                .style('margin-left', `${margin.left}px`)
                                .style('margin-top', `${margin.top}px`)
                                .append('canvas');
            this._svg = d3.select(custom).append('g');
        } else {
            this._container = d3.select(element.nativeElement).append('svg');
            this._svg = this._container.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
        }
        this.recalculateContainerViewSize();
    }

    public recalculateContainerViewSize(): void {
        const native = this.element.nativeElement;
        const margin = this._configuration.margin;
        const width = (this._configuration.width ? this._configuration.width : native.clientWidth) - margin.left - margin.right;
        const height = (this._configuration.height ? this._configuration.height : native.clientHeight) - margin.top - margin.bottom;

        const containerWidth = this.isCanvasBasedContainer() ? width : width + margin.left + margin.right;
        const containerHeight = this.isCanvasBasedContainer() ? height : height + margin.top + margin.bottom;

        this._container
            .attr('width', containerWidth)
            .attr('height', containerHeight);

        this._width = width;
        this._height = height;
    }

    public classed(name: string): void {
        this._svg.attr('class', name);
    }

    public styled(name: string, value: string): void {
        this._svg.style(name, value);
    }

    public getElementRef(): ElementRef {
        return this.element;
    }

    public getContainer(): { svg?: D3HTMLSelection, width?: number, height?: number } {
        return { svg: this._svg, width: this._width, height: this._height };
    }

    public getWidth(): number {
        return this._width;
    }

    public getHeight(): number {
        return this._height;
    }

    public isCanvasBasedContainer(): boolean {
        return this._configuration.canvas;
    }

    public drawCanvas(): void {
        const margin = this._configuration.margin;
        const context = (this._container.node() as HTMLCanvasElement).getContext('2d');
        context.clearRect(0, 0, this._width + margin.left + margin.right, this._height + margin.top + margin.bottom);

        const elements = this._svg.selectAll('rect.bar');
        elements.each(function() { // tslint:disable-line:only-arrow-functions
            const node = d3.select(this);

            let parentNode = this.parentNode;
            let parent: any = d3.select(parentNode);
            let translate: any;
            // debugger;
            while (parent !== null) {
                if (parent !== null && parent.attr('transform') !== null) {
                    translate = parent.attr('transform');
                    break;
                }
                parentNode = parentNode.parentNode;
                if (parentNode !== undefined && parentNode !== null) {
                    parent = d3.select(parentNode);
                } else {
                    break;
                }
            }

            context.globalAlpha = 0.9;
            context.fillStyle = node.attr('fill');
            context.fillRect(
                Number(node.attr('x')),
                Number(node.attr('y')),
                Number(node.attr('width')),
                Number(node.attr('height'))
            );
        });
    }

    public destroy(): void {
        this._container.remove();
    }

    private drawCanvasChilds(elements: D3HTMLSelection): void {
        // const childs = elements.select(function() {
        //     return this.childNodes;
        // })
    }
}

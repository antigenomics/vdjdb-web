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

import * as d3 from 'external/d3';

export type D3HTMLSelection = d3.Selection<d3.BaseType, any, HTMLElement, any>;

export interface ISVGContainerConfiguration {
    readonly backgroundFill?: string;
}

export class SVGContainer {
    public readonly svg: D3HTMLSelection;
    public readonly width: number;
    public readonly height: number;

    constructor(svg: D3HTMLSelection, width: number, height: number) {
        this.svg = svg;
        this.width = width;
        this.height = height;
    }
}
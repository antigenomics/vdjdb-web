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

import { ScaleOrdinal } from 'd3-scale';
import { ColorHash } from 'external/color-hash';
import * as d3 from 'external/d3';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';

export namespace ChartUtils {

    export namespace Color {

        export function generate(data: IChartDataEntry[]): ScaleOrdinal<string, string> {
            const colorHash = new ColorHash({ lightness: [ 0.5, 0.6, 0.7 ], saturation: [ 0.6, 0.5, 0.4 ] });
            const categories: string[] = data.map((d) => d.color ? d.color : colorHash.hex(d.name));
            const names: string[] = data.map((d) => d.name);

            return d3.scaleOrdinal(categories).domain(names);
            //
            // return d3.scaleOrdinal(
            //     d3.schemeCategory20.map((c) => (d3.color(c).brighter(0.1).toString())) // tslint:disable-line:no-magic-numbers
            // ).domain(data.filter((d) => d.color === undefined).map((d) => d.name));
        }

    }

}

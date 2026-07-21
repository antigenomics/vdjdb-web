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

import { ScaleOrdinal } from 'd3-scale';
import * as d3 from 'external/d3';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';

export namespace ChartUtils {

  export namespace Color {

    /**
     * ColorBrewer Spectral, verbatim from gnuplot-palettes (spectral.pal).
     *
     * Replaces a per-name hash, which picked a colour from the *text* of a label. That is stable, but
     * it is not a palette: neighbouring wedges landed on near-identical pastels as often as not, and
     * nothing about a chart's colours carried meaning or even guaranteed contrast.
     */
    const SPECTRAL: string[] = [
      '#D53E4F', '#F46D43', '#FDAE61', '#FEE08B', '#E6F598', '#ABDDA4', '#66C2A5', '#3288BD'
    ];

    /**
     * `n` colours spanning the full palette, rather than the first `n` of it — a three-slice chart
     * should read red / yellow-green / blue, not three shades of red.
     *
     * Up to eight categories the published colours are used exactly. Past that there is no way to
     * stay exact, so the anchors are interpolated; this is what d3's own scale-chromatic does with
     * the same ColorBrewer schemes.
     */
    function spread(n: number): string[] {
      if (n <= 1) {
        return [ SPECTRAL[ 0 ] ];
      }
      if (n <= SPECTRAL.length) {
        const picked: string[] = [];
        for (let i = 0; i < n; i = i + 1) {
          picked.push(SPECTRAL[ Math.round(i * (SPECTRAL.length - 1) / (n - 1)) ]);
        }
        return picked;
      }
      return d3.quantize(d3.interpolateRgbBasis(SPECTRAL), n);
    }

    export function generate(data: IChartDataEntry[]): ScaleOrdinal<string, string> {
      const palette: string[] = spread(data.length);
      // An entry that carries its own colour keeps it; the palette only fills the gaps.
      const categories: string[] = data.map((d, i) => d.color ? d.color : palette[ i ]);
      const names: string[] = data.map((d) => d.name);

      return d3.scaleOrdinal(categories).domain(names);
    }

  }

}

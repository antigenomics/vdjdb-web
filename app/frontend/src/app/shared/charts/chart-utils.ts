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
     * `n` colours evenly spaced along the palette, rather than the first `n` of it — a three-slice
     * chart should read red / yellow-green / blue, not three shades of red.
     *
     * A piecewise RGB ramp rather than a basis spline: piecewise passes exactly *through* every
     * anchor, so eight categories reproduce the published palette verbatim and the endpoints are
     * always the true red and blue. A spline (`interpolateRgbBasis`, what d3-scale-chromatic uses)
     * only honours the endpoints and smooths the interior away from the ColorBrewer values.
     *
     * Interpolating at every size, instead of picking discrete entries below eight, is what keeps the
     * spacing even: rounding onto eight fixed slots gave visibly uneven steps at n = 6 and 7.
     */
    function spread(n: number): string[] {
      if (n <= 1) {
        return [ SPECTRAL[ 0 ] ];
      }
      return d3.quantize(d3.piecewise(d3.interpolateRgb, SPECTRAL), n);
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

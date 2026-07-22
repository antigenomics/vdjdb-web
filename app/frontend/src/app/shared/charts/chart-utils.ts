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
     * Maximally distinct categorical colours, the iwanthue way.
     *
     * Replaces a Spectral ramp. A ramp is the wrong tool for categories: it is built to show *order*,
     * so adjacent entries are deliberately similar, and by the time a legend holds seventeen antigens
     * the neighbours are indistinguishable. What is wanted here is the opposite — every species and
     * every epitope as far from every other as the space allows, with no ordering implied.
     *
     * iwanthue's method is to sample a constrained region of CIE Lab and cluster it, taking the
     * cluster centres. This does the same job with greedy farthest-point selection, which needs no
     * iteration to converge and — crucially — is deterministic: the same `n` yields the same palette
     * on every render, so a species does not change colour when the chart redraws.
     *
     * The candidate region is constrained the way iwanthue's presets are, and for the same reason:
     * lightness away from both extremes so the colour is visible against white and its label stays
     * readable, chroma high enough not to wash out. Distance is CIE76 in Lab — not the CIEDE2000 the
     * site uses, but the differences it misses are far below the separation this returns.
     */
    const CANDIDATE_HUE_STEP: number = 2;
    const CANDIDATE_CHROMA: number[] = [ 30, 45, 60, 75, 90 ];
    const CANDIDATE_LIGHTNESS: number[] = [ 40, 52, 64, 76 ];

    interface ILabPoint { l: number; a: number; b: number; hue: number; css: string; }

    let candidateCache: ILabPoint[];
    const paletteCache: { [ n: number ]: string[] } = {};

    function candidates(): ILabPoint[] {
      if (candidateCache !== undefined) {
        return candidateCache;
      }
      const points: ILabPoint[] = [];
      for (let hue = 0; hue < 360; hue = hue + CANDIDATE_HUE_STEP) {
        for (const chroma of CANDIDATE_CHROMA) {
          for (const lightness of CANDIDATE_LIGHTNESS) {
            const color = d3.hcl(hue, chroma, lightness);
            // Out-of-gamut HCL clips to something that is no longer the colour asked for, and clipped
            // points collapse onto each other at the gamut edge - which would hand back duplicates.
            if (color.displayable()) {
              const lab = d3.lab(color);
              points.push({ l: lab.l, a: lab.a, b: lab.b, hue, css: color.toString() });
            }
          }
        }
      }
      candidateCache = points;
      return points;
    }

    function distanceSquared(left: ILabPoint, right: ILabPoint): number {
      const dl = left.l - right.l;
      const da = left.a - right.a;
      const db = left.b - right.b;
      return dl * dl + da * da + db * db;
    }

    /** `n` colours, as mutually distinct as the constrained space allows, ordered by hue. */
    export function spread(n: number): string[] {
      if (n <= 0) {
        return [];
      }
      if (paletteCache[ n ] !== undefined) {
        return paletteCache[ n ];
      }

      const pool = candidates();
      // Fixed seed rather than the farthest pair, which would be O(pool^2). Which point starts the
      // walk barely affects the spread, but it has to be the SAME point every time or the palette
      // would shuffle between renders.
      const seed = d3.lab(d3.hcl(0, 60, 52));
      const seedPoint: ILabPoint = { l: seed.l, a: seed.a, b: seed.b, hue: 0, css: '' };

      let nearest: number[] = pool.map((point) => distanceSquared(point, seedPoint));
      const chosen: ILabPoint[] = [];

      while (chosen.length < n && chosen.length < pool.length) {
        let bestIndex = 0;
        let bestDistance = -1;
        for (let i = 0; i < pool.length; i = i + 1) {
          if (nearest[ i ] > bestDistance) {
            bestDistance = nearest[ i ];
            bestIndex = i;
          }
        }
        const picked = pool[ bestIndex ];
        chosen.push(picked);
        // Running minimum, so each round costs one pass rather than one pass per already-chosen colour.
        nearest = nearest.map((current, i) => Math.min(current, distanceSquared(pool[ i ], picked)));
      }

      // By hue, so a legend runs red to violet instead of in discovery order. Distinctness is a
      // property of the set, so reordering it costs nothing.
      const palette = chosen.sort((left, right) => left.hue - right.hue).map((point) => point.css);
      paletteCache[ n ] = palette;
      return palette;
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

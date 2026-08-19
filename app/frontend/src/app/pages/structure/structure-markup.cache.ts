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

import { IStructureCluster } from 'pages/structure/structure';
import { StructureResponse } from 'pages/structure/structure-response';
import { Utils } from 'utils/utils';

/** Which rendering of a map to fetch: the full one for the front layer, the lighter one behind it. */
export type StructureMarkupMode = 'standard' | 'simple';

/**
 * Fetches contact maps and remembers them, keyed by structure and rendering.
 *
 * The overlay draws up to five maps and swaps which is which on every promotion, so the same file is
 * asked for repeatedly; a map is 20-47 KB of SVG. A failed fetch is cached too - as null - because
 * the alternative is re-requesting a missing file on every re-render.
 *
 * `simple` falls back to `standard` when the generator produced no lighter variant, which is common:
 * only some structures have one.
 */
export class StructureMarkupCache {

  private entries: Map<string, string | null> = new Map<string, string | null>();

  public async get(cluster: IStructureCluster, mode: StructureMarkupMode = 'standard'): Promise<string | undefined> {
    if (!cluster) {
      return undefined;
    }
    const visualization = StructureResponse.toVisualization(cluster.visualization);
    if (!visualization) {
      return undefined;
    }
    const keyBase = (cluster.clusterId || '').trim().toLowerCase();
    if (!keyBase) {
      return undefined;
    }

    const key = `${keyBase}::${mode}`;
    if (this.entries.has(key)) {
      const cached = this.entries.get(key);
      return cached === null ? undefined : cached;
    }

    const url = mode === 'simple' ? (visualization.simpleUrl || visualization.url) : visualization.url;
    if (!url) {
      if (mode === 'simple') {
        return this.get(cluster, 'standard');
      }
      this.entries.set(key, null);
      return undefined;
    }

    try {
      const response = await Utils.HTTP.get(url);
      const markup = StructureMarkupCache.normalize(response.response);
      this.entries.set(key, markup);
      return markup;
    } catch {
      this.entries.set(key, null);
      return mode === 'simple' ? this.get(cluster, 'standard') : undefined;
    }
  }

  /** Forgets both renderings of one structure, so the next request re-fetches. */
  public release(clusterOrId: IStructureCluster | string | undefined): void {
    const clusterId = typeof clusterOrId === 'string' ? clusterOrId : clusterOrId && clusterOrId.clusterId;
    const keyBase = typeof clusterId === 'string' ? clusterId.trim().toLowerCase() : '';
    if (!keyBase) {
      return;
    }
    this.entries.delete(`${keyBase}::standard`);
    this.entries.delete(`${keyBase}::simple`);
  }

  /**
   * Pulls the `<svg>` out of the fetched document and makes it fill its container.
   *
   * The generator writes a whole HTML page around each map, and matplotlib sizes the `<svg>` in
   * points. Left alone it renders at its natural size and ignores the overlay's box.
   */
  public static normalize(source: string): string {
    if (!source) {
      return '';
    }
    try {
      const svg = new DOMParser().parseFromString(source, 'text/html').querySelector('svg');
      if (!svg) {
        return source;
      }
      svg.setAttribute('width', '100%');
      svg.setAttribute('height', '100%');
      return svg.outerHTML;
    } catch {
      return source;
    }
  }
}

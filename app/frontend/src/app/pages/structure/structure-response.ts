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

import {
  IStructureCluster, IStructureClusterMeta, IStructureModelMetrics, IStructuresMetadata,
  IStructuresMetadataTreeLevel, IStructuresMetadataTreeLevelValue, IStructuresSearchTreeFilter,
  IStructuresSearchTreeFilterEntry, IStructuresSearchTreeFilterResult, IStructureVisualization
} from 'pages/structure/structure';
import { Utils } from 'utils/utils';

/**
 * Reads what the structures API actually returns.
 *
 * Two shapes reach the page. `/api/structures/filter` answers with `{ epitopes: [...] }`, which is
 * already what the page wants; the CDR3 and single-structure paths answer with a flat `{ items: [] }`
 * carrying an untyped `meta` map, and have to be folded into the same shape. On top of that the meta
 * keys are not stable - `mhc.class`, `mhcclass` and `mhcClass` all occur - because they come from
 * column names in the source TSV rather than from a schema.
 *
 * So every read here is defensive on purpose, and it is all pure: no injection, no subjects, no
 * caching. It was 250 lines of the service, which is why it is its own file now.
 */
export class StructureResponse {

  public static normalizeFilterResult(treeFilter: IStructuresSearchTreeFilter, raw: any, metadata: IStructuresMetadata): IStructuresSearchTreeFilterResult {
    if (raw && Array.isArray(raw.epitopes)) {
      return raw;
    }

    const entries = Array.isArray(treeFilter && treeFilter.entries) ? treeFilter.entries : [];
    const items = raw && Array.isArray(raw.items) ? raw.items : [];

    const hash = StructureResponse.resolveEpitopeHash(metadata, entries) || StructureResponse.buildFallbackHash(entries);
    const epitopeLabel = StructureResponse.resolveEpitopeLabel(entries) || StructureResponse.extractEpitopeFromItems(items) || 'structures';

    const targetStructureEntry = entries.find((entry) => entry && entry.name === 'structure.id' && typeof entry.value === 'string');
    const normalizedTarget = targetStructureEntry ? targetStructureEntry.value.trim().toLowerCase() : '';

    const clusters = items
      .map((item: any) => StructureResponse.toCluster(item))
      .filter((cluster: IStructureCluster | undefined) => {
        if (!cluster) {
          return false;
        }
        if (!normalizedTarget) {
          return true;
        }
        const clusterId = (cluster.clusterId || '').trim().toLowerCase();
        return clusterId === normalizedTarget;
      });

    return {
      epitopes: [
        {
          hash,
          epitope: epitopeLabel,
          clusters
        }
      ]
    };
  }

  public static resolveEpitopeHash(metadata: IStructuresMetadata, entries: IStructuresSearchTreeFilterEntry[]): string | undefined {
    if (!metadata || !metadata.root || !Array.isArray(entries) || entries.length === 0) {
      return undefined;
    }

    let level: IStructuresMetadataTreeLevel | null = metadata.root;
    for (let index = 0; index < entries.length; ++index) {
      const entry = entries[index];
      if (!level) {
        return undefined;
      }
      const value = level.values.find((candidate) => candidate.value === entry.value);
      if (!value) {
        return undefined;
      }
      if (index === entries.length - 1) {
        return value.hash;
      }
      level = value.next;
    }
    return undefined;
  }

  public static resolveLeaf(metadata: IStructuresMetadata,
                                entries: IStructuresSearchTreeFilterEntry[]): IStructuresMetadataTreeLevelValue | undefined {
    if (!metadata || !metadata.root || !Array.isArray(entries) || entries.length === 0) {
      return undefined;
    }
    const relevant = entries.filter((entry) => entry && [ 'mhc.class', 'mhc.pair', 'antigen.epitope' ].indexOf(entry.name) !== -1);
    if (relevant.length === 0) {
      return undefined;
    }
    let level: IStructuresMetadataTreeLevel | null = metadata.root;
    for (let index = 0; index < relevant.length; ++index) {
      const entry = relevant[index];
      if (!level) {
        return undefined;
      }
      const value = level.values.find((candidate) => {
        if (entry.name === 'mhc.pair') {
          return StructureResponse.normalizeMhcPair(candidate.value) === StructureResponse.normalizeMhcPair(entry.value);
        }
        return candidate.value.toLowerCase() === entry.value.toLowerCase();
      });
      if (!value) {
        return undefined;
      }
      if (index === relevant.length - 1) {
        return value;
      }
      level = value.next;
    }
    return undefined;
  }

  public static resolveEpitopeLabel(entries: IStructuresSearchTreeFilterEntry[]): string | undefined {
    if (!Array.isArray(entries)) {
      return undefined;
    }
    const epitopeEntry = entries.slice().reverse().find((entry) => entry && entry.name === 'antigen.epitope');
    return epitopeEntry && typeof epitopeEntry.value === 'string' ? epitopeEntry.value : undefined;
  }

  public static extractEpitopeFromItems(items: any[]): string | undefined {
    if (!Array.isArray(items)) {
      return undefined;
    }
    for (const item of items) {
      const meta = item && item.meta;
      const candidate = StructureResponse.pickMetaValue(meta, [ 'antigen.epitope', 'antigenEpitope', 'antigen_epitope' ]);
      if (candidate) {
        return candidate;
      }
    }
    return undefined;
  }

  public static toCluster(item: any): IStructureCluster {
    const meta = item && typeof item.meta === 'object' ? item.meta : {};
    const clusterMeta: IStructureClusterMeta = {
      species: StructureResponse.pickMetaValue(meta, [ 'species' ]) || '',
      gene: StructureResponse.pickMetaValue(meta, [ 'gene' ]) || '',
      mhcclass: StructureResponse.pickMetaValue(meta, [ 'mhc.class', 'mhcclass' ]) || '',
      mhca: StructureResponse.pickMetaValue(meta, [ 'mhc.a', 'mhca' ]) || '',
      mhcb: StructureResponse.pickMetaValue(meta, [ 'mhc.b', 'mhcb' ]) || '',
      antigenGene: StructureResponse.pickMetaValue(meta, [ 'antigen.gene', 'antigenGene' ]) || '',
      antigenSpecies: StructureResponse.pickMetaValue(meta, [ 'antigen.species', 'antigenSpecies' ]) || '',
      cellSubset: StructureResponse.pickMetaValue(meta, [ 'cell.subset', 'cellSubset', 'cell_subset' ]) || ''
    };

    const clusterId = item && item.id ? String(item.id) : StructureResponse.pickMetaValue(meta, [ 'structure.id', 'structureId' ]) || StructureResponse.buildClusterIdFallback(meta);

    const visualization = StructureResponse.toVisualization(item && item.visualization);

    const displayId = item && typeof item.displayId === 'string' ? item.displayId : undefined;
    const tcrPairLabel = item && typeof item.tcrPairLabel === 'string' ? item.tcrPairLabel : undefined;
    const cdr3aVEnd = StructureResponse.pickIntValue(item, [ 'cdr3aVEnd' ]);
    const cdr3aJStart = StructureResponse.pickIntValue(item, [ 'cdr3aJStart' ]);
    const cdr3bVEnd = StructureResponse.pickIntValue(item, [ 'cdr3bVEnd' ]);
    const cdr3bJStart = StructureResponse.pickIntValue(item, [ 'cdr3bJStart' ]);

    const cluster: IStructureCluster = {
      clusterId,
      displayId,
      tcrPairLabel,
      size: Number(item && item.size ? item.size : 1),
      length: Number(item && item.length ? item.length : 0),
      vsegm: StructureResponse.pickMetaValue(meta, [ 'v', 'vsegm', 'v.segm' ]) || '',
      jsegm: StructureResponse.pickMetaValue(meta, [ 'j', 'jsegm', 'j.segm' ]) || '',
      cdr3aVEnd,
      cdr3aJStart,
      cdr3bVEnd,
      cdr3bJStart,
      meta: clusterMeta,
      visualization,
      metrics: StructureResponse.toMetrics(item && item.metrics)
    } as IStructureCluster;

    (cluster as any).rawMeta = meta;
    return cluster;
  }

  public static toMetrics(raw: any): IStructureModelMetrics | undefined {
    if (!raw || typeof raw !== 'object') {
      return undefined;
    }
    const num = (v: any): number | undefined => {
      const parsed = typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : NaN);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    return {
      isNative: raw.isNative === true,
      numContacts: num(raw.numContacts),
      iptm: num(raw.iptm),
      confidence: num(raw.confidence),
      iptmPct: num(raw.iptmPct),
      confidencePct: num(raw.confidencePct),
      bindingModeOutlier: typeof raw.bindingModeOutlier === 'boolean' ? raw.bindingModeOutlier : undefined
    };
  }

  public static pickMetaValue(meta: any, keys: string[]): string | undefined {
    if (!meta) {
      return undefined;
    }
    for (const key of keys) {
      const candidate = meta[key];
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate.trim();
      }
    }
    return undefined;
  }

  public static pickIntValue(source: any, keys: string[]): number | undefined {
    if (!source) {
      return undefined;
    }
    for (const key of keys) {
      const candidate = source[key];
      if (typeof candidate === 'number' && Number.isFinite(candidate)) {
        return Math.trunc(candidate);
      }
      if (typeof candidate === 'string') {
        const parsed = Number(candidate);
        if (Number.isFinite(parsed)) {
          return Math.trunc(parsed);
        }
      }
    }
    return undefined;
  }

  public static buildClusterIdFallback(meta: any): string {
    const base = JSON.stringify(meta || {});
    const hash = Utils.String.hashCode(base);
    return `structure:${hash}`;
  }

  public static toVisualization(raw: any): IStructureVisualization | undefined {
    if (!raw || typeof raw.url !== 'string') {
      return undefined;
    }
    const url = String(raw.url).trim();
    if (!url) {
      return undefined;
    }
    const kind = typeof raw.kind === 'string' ? raw.kind.toLowerCase() : 'html';
    if (kind !== 'html') {
      return undefined;
    }
    const simpleUrlRaw = typeof raw.simpleUrl === 'string' ? String(raw.simpleUrl).trim() : '';
    return simpleUrlRaw
      ? { url, kind: 'html', simpleUrl: simpleUrlRaw }
      : { url, kind: 'html' };
  }

  public static buildFallbackHash(entries: IStructuresSearchTreeFilterEntry[]): string {
    return 'structures:' + JSON.stringify(entries || []);
  }

  public static normalizeMhcPair(value: string | undefined | null): string {
    if (!value) {
      return '';
    }
    const parts = value.split('/').map((part) => part.replace(/:.+/, '').trim()).filter((part) => part.length > 0);
    return parts.join('/').toLowerCase();
  }
}

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

import { Injectable } from '@angular/core';
import {
  IStructureCDR3SearchEntry,
  IStructureCDR3SearchResult,
  IStructureCDR3SearchResultOptions,
  IStructureCluster,
  IStructureEpitope,
  IStructureEpitopeViewOptions,
  IStructuresMetadata,
  IStructuresMetadataTreeLevel,
  IStructuresMetadataTreeLevelValue,
  IStructuresSearchTreeFilter,
  IStructuresSearchTreeFilterResult
} from 'pages/structure/structure';
import { combineLatest, Observable, ReplaySubject, Subject } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';
import { StructureMarkupCache, StructureMarkupMode } from 'pages/structure/structure-markup.cache';
import { StructureMetadataTree } from 'pages/structure/structure-metadata-tree';
import { StructureResponse } from 'pages/structure/structure-response';
import { Utils } from 'utils/utils';
import { EpitopeBridgeService, IBridgeEpitope } from '../../epitope-bridge.service';

export namespace StructuresServiceWebSocketActions {
  export const METADATA = 'meta';
}

export namespace StructuresServiceEvents {
  export const UPDATE_SELECTED: number = 1;
  export const UPDATE_SCROLL: number = 2;
  export const UPDATE_RESIZE: number = 3;
  export const HIDE_CLUSTERS: number = 4;
}

export type StructuresServiceEvents = number;

export namespace StructureSearchState {
  export const SEARCH_TREE: number = 1;
  export const SEARCH_CDR3: number = 2;
}

export type StructureSearchState = number;

@Injectable()
export class StructureService {
  public static readonly minSubstringCDR3Length: number = 3;

  private isMetadataLoaded: boolean = false;
  private isMetadataLoading: boolean = false;
  private state: StructureSearchState = StructureSearchState.SEARCH_TREE;
  private events: Subject<StructuresServiceEvents> = new Subject<StructuresServiceEvents>();
  private metadata: Subject<IStructuresMetadata> = new ReplaySubject(1);
  private selected: Subject<IStructuresMetadataTreeLevelValue[]> = new ReplaySubject(1);
  private epitopes: Subject<IStructureEpitope[]> = new ReplaySubject(1);
  private options: Subject<IStructureEpitopeViewOptions> = new ReplaySubject(1);
  private clusters: Subject<IStructureCDR3SearchResult> = new ReplaySubject(1);
  private loadingState: Subject<boolean> = new ReplaySubject(1);
  private highlightedClusterIdx: ReplaySubject<string | null> = new ReplaySubject(1);
  private selectedClusterIds: ReplaySubject<string[]> = new ReplaySubject(1);
  private markup: StructureMarkupCache = new StructureMarkupCache();

  constructor(private logger: LoggerService, private notifications: NotificationService, private bridge: EpitopeBridgeService) {}

  public async load(): Promise<void> {
    if (!this.isMetadataLoaded && !this.isMetadataLoading) {
      this.isMetadataLoading = true;
      const response = await Utils.HTTP.get('/api/structures/metadata');
      const root = JSON.parse(response.response) as { root: IStructuresMetadataTreeLevel };
      const metadata: IStructuresMetadata = { root: root.root };
      this.logger.debug('Structure metadata', metadata);
      metadata.root.values.forEach((value) => (value.isOpened = true));
      this.metadata.next(metadata);
      this.selected.next([]);
      this.epitopes.next([]);
      this.options.next({ isNormalized: false });
      this.clusters.next({ options: { cdr3: '', top: 15, gene: 'Both', substring: false }, clusters: undefined, clustersNorm: undefined });
      this.highlightedClusterIdx.next(null);
      this.isMetadataLoaded = true;
      this.isMetadataLoading = false;
    }
  }

  public setSearchState(state: StructureSearchState): void {
    this.state = state;
  }

  public getSearchState(): StructureSearchState {
    return this.state;
  }

  public getMetadata(): Observable<IStructuresMetadata> {
    return this.metadata.asObservable();
  }

  public getEpitopes(): Observable<IStructureEpitope[]> {
    return this.epitopes.asObservable();
  }

  public getSelected(): Observable<IStructuresMetadataTreeLevelValue[]> {
    return this.selected.asObservable();
  }

  public getEvents(): Observable<StructuresServiceEvents> {
    return this.events.asObservable();
  }

  public getOptions(): Observable<IStructureEpitopeViewOptions> {
    return this.options.asObservable();
  }

  public getCDR3Clusters(): Observable<IStructureCDR3SearchResult> {
    return this.clusters.asObservable();
  }

  public getCDR3SearchOptions(): Observable<IStructureCDR3SearchResultOptions> {
    return this.clusters.asObservable().pipe(map((c) => c.options));
  }

  public getHighlightedClusterIdx(): Observable<string | null> {
    return this.highlightedClusterIdx.asObservable();
  }

  public setHighlightedClusterIdx(hash: string | null): void {
    this.highlightedClusterIdx.next(hash);
  }

  public getSelectedClusterIds(): Observable<string[]> {
    return this.selectedClusterIds.asObservable();
  }

  public setSelectedClusterIds(ids: string[]): void {
    this.selectedClusterIds.next(ids);
  }

  public setOptions(options: IStructureEpitopeViewOptions): void {
    this.options.next(options);
  }

  public fireScrollUpdateEvent(): void {
    this.events.next(StructuresServiceEvents.UPDATE_SCROLL);
  }

  public fireResizeUpdateEvent(): void {
    this.events.next(StructuresServiceEvents.UPDATE_RESIZE);
  }

  public fireHideEvent(): void {
    this.events.next(StructuresServiceEvents.HIDE_CLUSTERS);
  }

  public isLoading(): Observable<boolean> {
    return this.loadingState.asObservable();
  }

  public async searchCDR3ByUrl(query: string, substring: boolean = false, gene: string = 'TRA'): Promise<void> {
    await this.load();
    this.setSearchState(StructureSearchState.SEARCH_CDR3);
    this.searchCDR3(query, substring, gene);
  }

  public async filterByUrl(filters: { species: string, tcrChain: string, mhcClass: string, gene: string, epitopeSeq: string, tcrHash?: string }): Promise<void> {
    await this.load();
    this.setSearchState(StructureSearchState.SEARCH_TREE);

    this.metadata.pipe(take(1)).subscribe((metadata) => {
      const path = StructureMetadataTree.findPath(metadata, filters.mhcClass, filters.gene, filters.epitopeSeq);
      if (path.length === 0) {
        return;
      }
      path.forEach((node) => (node.isOpened = true));

      // Built from the tree's own values rather than from the URL, so the filter posted to the
      // server carries the canonical spelling even when the link named the MHC at full resolution.
      const treeFilter: IStructuresSearchTreeFilter = {
        entries: [
          { name: 'mhc.class', value: path[ 0 ].value },
          { name: 'mhc.pair', value: path[ 1 ].value },
          { name: 'antigen.epitope', value: path[ 2 ].value }
        ]
      };

      this.select(treeFilter, 'replace');
      this.highlightedClusterIdx.next(filters.tcrHash ? filters.tcrHash.toLowerCase() : null);
    });
  }

  public searchCDR3(cdr3: string, substring: boolean = false, gene: string = 'BOTH', top: number = 15): void {
    this.setSearchState(StructureSearchState.SEARCH_CDR3);
    if (cdr3 === null || cdr3 === undefined || cdr3.length === 0) {
      this.notifications.warn('Structure CDR3', 'Empty search input');
      return;
    }
    if (substring === true && cdr3.length < StructureService.minSubstringCDR3Length) {
      this.notifications.warn('Structure CDR3', `Length of CDR3 substring should be greater or equal than ${StructureService.minSubstringCDR3Length}`);
      return;
    }
    // CDR3 search has no single selected epitope to carry across pages.
    this.bridge.clear();
    this.loadingState.next(true);
    Utils.HTTP.post('/api/structures/cdr3', { cdr3, substring, gene, top }).then((response) => {
     const raw = JSON.parse(response.response);
      const result = this.normalizeStructureCdr3Response(raw);
      result.options.cdr3 = cdr3;
      result.options.substring = substring;
      result.options.gene = gene;
      result.options.top = top;

      const hasStructureId = (cl: IStructureCluster): boolean => {
        if (!cl) { return false; }
        const sid = typeof cl.clusterId === 'string' ? cl.clusterId.trim() : '';
        return sid.length > 0;
      };

      const clusters: IStructureCDR3SearchEntry[] = Array.isArray(result.clusters) ? [ ...result.clusters ] : [];
      const clustersNorm: IStructureCDR3SearchEntry[] = Array.isArray(result.clustersNorm) ? [ ...result.clustersNorm ] : [];

      const filteredClusters = clusters.filter((e: IStructureCDR3SearchEntry) => hasStructureId(e.cluster));
      const filteredClustersNorm = clustersNorm.filter((e: IStructureCDR3SearchEntry) => hasStructureId(e.cluster));

      filteredClusters.forEach((entry: IStructureCDR3SearchEntry) => {
        if (entry && entry.cluster && !(entry.cluster as any).rawMeta) {
          (entry.cluster as any).rawMeta = entry.cluster.meta;
        }
        const cluster = entry && entry.cluster ? entry.cluster as IStructureCluster : undefined;
        this.ensureVisualization(cluster);
      });
      filteredClustersNorm.forEach((entry: IStructureCDR3SearchEntry) => {
        if (entry && entry.cluster && !(entry.cluster as any).rawMeta) {
          (entry.cluster as any).rawMeta = entry.cluster.meta;
        }
        const cluster = entry && entry.cluster ? entry.cluster as IStructureCluster : undefined;
        this.ensureVisualization(cluster);
      });

      const comparator = (l: IStructureCDR3SearchEntry, r: IStructureCDR3SearchEntry) => {
        if (l.info < r.info) {
          return 1;
        } else if (l.info === r.info) {
          if (l.cluster.size < r.cluster.size) {
            return 1;
          } else if (l.cluster.size > r.cluster.size) {
            return -1;
          } else {
            return 0;
          }
        } else {
          return -1;
        }
      };

      filteredClusters.sort(comparator);
      filteredClustersNorm.sort(comparator);

      result.clusters = filteredClusters;
      result.clustersNorm = filteredClustersNorm;

      this.clusters.next(result);
      this.loadingState.next(false);
      // tslint:disable-next-line:no-magic-numbers
      this.notifications.info('Structure CDR3', 'Loaded successfully', 1000);
    }).catch(() => {
      this.loadingState.next(false);
      this.notifications.error('Structure CDR3', 'Unable to load results');
    });
  }
 
  private normalizeStructureCdr3Response(raw: any): IStructureCDR3SearchResult {
    const defaultOptions: IStructureCDR3SearchResultOptions = { cdr3: '', top: 0, gene: 'BOTH', substring: false };
    const options = raw && raw.options ? raw.options as IStructureCDR3SearchResultOptions : defaultOptions;
    const clusters = Array.isArray(raw && raw.clusters) ? raw.clusters as IStructureCDR3SearchEntry[] : [];
    const clustersNorm = Array.isArray(raw && raw.clustersNorm) ? raw.clustersNorm as IStructureCDR3SearchEntry[] : [];
    return { options, clusters, clustersNorm };
  }

  public select(treeFilter: IStructuresSearchTreeFilter, mode: 'append' | 'replace' = 'append'): void {
    this.setSearchState(StructureSearchState.SEARCH_TREE);
    this.rememberBridgeEpitope(treeFilter);
    if (mode === 'replace') {
      this.metadata.pipe(take(1)).subscribe((metadata) => {
        this.clearSelectedValues(metadata);
        const leaf = StructureMetadataTree.resolveLeaf(metadata, treeFilter.entries);
        if (leaf) {
          this.selectTreeLevelValue(leaf);
        }
        this.updateSelected();
      });
      this.epitopes.next([]);
    } else {
      this.updateSelected();
    }
    this.loadingState.next(true);
    Utils.HTTP.post('/api/structures/filter', treeFilter).then((response) => {
      try {
        const raw: any = JSON.parse(response.response);

        combineLatest([
          this.metadata.pipe(take(1)),
          this.epitopes.pipe(take(1))
        ]).pipe(take(1)).subscribe(([ metadata, current ]: [ IStructuresMetadata, IStructureEpitope[] ]) => {
          let result: IStructuresSearchTreeFilterResult;
          try {
            result = StructureResponse.normalizeFilterResult(treeFilter, raw, metadata);
          } catch (normalizationError) {
            this.loadingState.next(false);
            this.notifications.error('Structure', 'Could not read the structures for this selection. Please try again or select another epitope.');
            return;
          }

          if (!Array.isArray(result.epitopes)) {
            this.loadingState.next(false);
            this.notifications.error('Structure', 'Could not read the structures for this selection. Please try again or select another epitope.');
            return;
          }

          const hashes: string[] = current.map((ep) => ep.hash);
          const incoming: IStructureEpitope[] = (result.epitopes as unknown as IStructureEpitope[])
              .filter((ep: IStructureEpitope) => hashes.indexOf(ep.hash) === -1);

          const newEpitopes: IStructureEpitope[] = incoming
              .map((epitope: IStructureEpitope) => {
                const filteredClusters = (epitope.clusters || [])
                    .map((cluster) => {
                      if (!(cluster as any).rawMeta) {
                        (cluster as any).rawMeta = cluster.meta;
                      }
                      this.ensureVisualization(cluster as IStructureCluster);
                      return cluster;
                    })
                    .filter((cluster) => !!cluster.visualization)
                    .sort((left, right) => right.size - left.size);
                return { ...epitope, clusters: filteredClusters };
              })
              .filter((epitope) => Array.isArray(epitope.clusters) && epitope.clusters.length > 0);

          const updated = mode === 'replace' ? newEpitopes : [ ...current, ...newEpitopes ];
          this.epitopes.next(updated);
          this.loadingState.next(false);
          // tslint:disable-next-line:no-magic-numbers
          this.notifications.info('Structure', 'Loaded successfully', 1000);
        });
      } catch (err) {
        this.loadingState.next(false);
        this.notifications.error('Structure', 'Could not read the structures for this selection. Please try again or select another epitope.');
      }
    }).catch(() => {
      this.loadingState.next(false);
      this.notifications.error('Structure', 'Unable to load results');
    });

  }

  public discard(_: IStructuresSearchTreeFilter): void {
    this.updateSelected();
    setImmediate(() => {
      this.updateEpitopes();
    });
  }

  public isTreeLevelValueSelected(value: IStructuresMetadataTreeLevelValue): boolean {
    if (value.next !== null) {
      return value.next.values.reduce((previous, current) => previous && this.isTreeLevelValueSelected(current), true);
    } else {
      return value.isSelected;
    }
  }

  public selectTreeLevelValue(value: IStructuresMetadataTreeLevelValue): void {
    if (value.next !== null) {
      value.next.values.forEach((v) => {
        this.selectTreeLevelValue(v);
      });
    } else {
      value.isSelected = true;
    }
  }

  public discardTreeLevelValue(value: IStructuresMetadataTreeLevelValue): void {
    if (value.next !== null) {
      value.next.values.forEach((v) => {
        this.discardTreeLevelValue(v);
      });
    } else {
      value.isSelected = false;
    }
  }

  public updateSelected(): void {
    this.metadata.pipe(take(1)).subscribe((metadata) => {
      const selectedValues = StructureMetadataTree.leafValues(metadata.root)
          .filter(([ _, value ]) => value.isSelected)
          .map(([ _, value ]) => value);
      this.selected.next(selectedValues);
      if (selectedValues.length === 0) {
        // Full deselection — drop the cross-page epitope memory.
        this.bridge.clear();
      }
      this.events.next(StructuresServiceEvents.UPDATE_SELECTED);
      setTimeout(() => {
        this.events.next(StructuresServiceEvents.UPDATE_SCROLL);
        // tslint:disable-next-line:no-magic-numbers
      }, 100);
    });
  }

  public updateEpitopes(): void {
    combineLatest(this.selected, this.epitopes).pipe(take(1)).subscribe(([ selected, epitopes ]) => {
      const selectedEpitopeHashes = selected.map((s) => s.hash);
      const remainingEpitopes = epitopes.filter((e) => selectedEpitopeHashes.indexOf(e.hash) !== -1);
      this.epitopes.next(remainingEpitopes);
    });
  }

  // Record the just-selected epitope into the cross-page bridge so the Motif page
  // can re-open it. The structure tree only knows mhc.class / mhc.pair / epitope
  // (no species or tcr_chain), which is enough for best-effort matching.
  private rememberBridgeEpitope(treeFilter: IStructuresSearchTreeFilter): void {
    const entries = Array.isArray(treeFilter && treeFilter.entries) ? treeFilter.entries : [];
    const mhcClass = entries.find((e) => e && e.name === 'mhc.class');
    const mhcPair = entries.find((e) => e && e.name === 'mhc.pair');
    const epitope = entries.find((e) => e && e.name === 'antigen.epitope');
    if (mhcClass && mhcPair && epitope) {
      this.bridge.set({
        mhcClass:   mhcClass.value,
        gene:       mhcPair.value,
        epitopeSeq: epitope.value
      });
    }
  }

  // Resolve a (possibly cross-page) epitope descriptor against the loaded metadata
  // tree, returning the URL params for the matching leaf or null if this page does
  // not contain that epitope. Matching is best-effort on epitope sequence + MHC
  // class, refined by MHC head. Used when arriving from the Motif page.
  public resolveEpitopeParams(target: IBridgeEpitope): Observable<{ [key: string]: string } | null> {
    return this.metadata.pipe(take(1), map((metadata) => {
      const wantEpitope = target.epitopeSeq.toLowerCase();
      const wantClass = target.mhcClass.toLowerCase();
      const wantHead = EpitopeBridgeService.mhcHead(target.gene);
      for (const classNode of metadata.root.values) {
        if (classNode.value.toLowerCase() !== wantClass) { continue; }
        if (!classNode.next) { continue; }
        for (const pairNode of classNode.next.values) {
          if (wantHead && EpitopeBridgeService.mhcHead(pairNode.value) !== wantHead) { continue; }
          if (!pairNode.next) { continue; }
          for (const epitopeNode of pairNode.next.values) {
            if (epitopeNode.value.toLowerCase() === wantEpitope) {
              return {
                species:     target.species || '',
                tcr_chain:   target.tcrChain || '',
                mhc_class:   classNode.value,
                gene:        pairNode.value,
                epitope_seq: epitopeNode.value
              };
            }
          }
        }
      }
      return null;
    }));
  }

  public findTreeLevelValue(hash: string): Observable<IStructuresMetadataTreeLevelValue[]> {
    return this.metadata.pipe(take(1), map((metadata) => {
      return StructureMetadataTree.leafValues(metadata.root)
          .filter(([ h, _ ]) => h === hash)
          .map(([ _, value ]) => value);
    }));
  }

  private clearSelectedValues(metadata: IStructuresMetadata): void {
    if (!metadata || !metadata.root) {
      return;
    }
    StructureMetadataTree.leafValues(metadata.root).forEach(([ _, value ]) => {
      value.isSelected = false;
    });
  }

  private ensureVisualization(cluster: IStructureCluster | undefined): void {
    if (!cluster) {
      return;
    }
    const normalized = StructureResponse.toVisualization(cluster.visualization);
    if (normalized) {
      (cluster as any).visualization = normalized;
    } else {
      (cluster as any).visualization = undefined;
    }
  }

  public getHtmlVisualizationMarkup(cluster: IStructureCluster, mode: StructureMarkupMode = 'standard'): Promise<string | undefined> {
    return this.markup.get(cluster, mode);
  }

  public releaseHtmlVisualizationMarkup(clusterOrId: IStructureCluster | string | undefined): void {
    this.markup.release(clusterOrId);
  }
}

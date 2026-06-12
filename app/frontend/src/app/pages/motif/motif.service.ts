/*
 * Copyright 2017-2019 Bagaev Dmitry
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Injectable } from '@angular/core';
import {
  IMotifCDR3SearchEntry,
  IMotifCDR3SearchResult,
  IMotifCDR3SearchResultOptions,
  IMotifClusterMembersExportResponse,
  IMotifEpitope,
  IMotifEpitopeViewOptions,
  IMotifsMetadata,
  IMotifsMetadataTreeLevel,
  IMotifsMetadataTreeLevelValue,
  IMotifsSearchTreeFilter,
  IMotifsSearchTreeFilterResult
} from 'pages/motif/motif';
import { BehaviorSubject, combineLatest, Observable, ReplaySubject, Subject } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ISeqLogoChartConfiguration } from 'shared/charts/seqlogo/seqlogo-configuration';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';
import { Utils } from 'utils/utils';
import { EpitopeBridgeService, IBridgeEpitope } from '../../epitope-bridge.service';

export namespace MotifsServiceWebSocketActions {
  export const METADATA = 'meta';
}

export namespace MotifsServiceEvents {
  export const UPDATE_SELECTED: number = 1;
  export const UPDATE_SCROLL: number = 2;
  export const UPDATE_RESIZE: number = 3;
  export const HIDE_CLUSTERS: number = 4;
}

export type MotifsServiceEvents = number;

export namespace MotifSearchState {
  export const SEARCH_TREE: number = 1;
  export const SEARCH_CDR3: number = 2;
}

export type MotifSearchState = number;

export type MotifMethod = 'tcrnet' | 'tcremp';

@Injectable()
export class MotifService {
  public static readonly minSubstringCDR3Length: number = 3;
  public static readonly clusterViewportChartConfiguration: ISeqLogoChartConfiguration = {
    container: { height: 150 }
  };

  private isMetadataLoaded: boolean = false;
  private isMetadataLoading: boolean = false;

  private lastEpitopeUrlParams: { [key: string]: string } | null = null;
  private lastCDR3SearchOptions: IMotifCDR3SearchResultOptions | null = null;

  private state: MotifSearchState = MotifSearchState.SEARCH_TREE;
  private method: MotifMethod = 'tcrnet';

  private events: Subject<MotifsServiceEvents> = new Subject<MotifsServiceEvents>();
  private metadata: Subject<IMotifsMetadata> = new ReplaySubject(1);
  private selected: Subject<IMotifsMetadataTreeLevelValue[]> = new ReplaySubject(1);
  private epitopes: Subject<IMotifEpitope[]> = new ReplaySubject(1);
  private options: Subject<IMotifEpitopeViewOptions> = new ReplaySubject(1);
  private highlightedCid: ReplaySubject<string | null> = new ReplaySubject(1);

  private clusters: Subject<IMotifCDR3SearchResult> = new ReplaySubject(1);

  private loadingState: Subject<boolean> = new ReplaySubject(1);
  private contentReady: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

  constructor(private logger: LoggerService, private notifications: NotificationService, private bridge: EpitopeBridgeService) {}

  public getMethod(): MotifMethod {
    return this.method;
  }

  public async switchMethod(newMethod: MotifMethod): Promise<void> {
    if (this.method === newMethod && this.isMetadataLoaded) {
      return;
    }
    this.method = newMethod;
    this.isMetadataLoaded = false;
    this.isMetadataLoading = false;
    this.state = MotifSearchState.SEARCH_TREE;
    this.lastEpitopeUrlParams = null;
    this.lastCDR3SearchOptions = null;
    this.highlightedCid.next(null);
    this.selected.next([]);
    this.epitopes.next([]);
    this.options.next({ isNormalized: false, allowMultiple: false });
    this.clusters.next({ options: { cdr3: '', top: 15, gene: 'Both', substring: false }, clusters: undefined, clustersNorm: undefined });
    this.loadingState.next(true);
    await this.load();
    this.loadingState.next(false);
  }

  public async load(): Promise<void> {
    if (!this.isMetadataLoaded && !this.isMetadataLoading) {
      this.isMetadataLoading = true;
      const response = await Utils.HTTP.get(`/api/motifs/metadata?method=${this.method}`);
      const root = JSON.parse(response.response) as { root: IMotifsMetadataTreeLevel };
      const metadata = { root: root.root };
      this.logger.debug('Motifs metadata', metadata);

      metadata.root.values.forEach((value) => value.isOpened = true);

      this.metadata.next(metadata);
      this.selected.next([]);
      this.epitopes.next([]);
      this.options.next({ isNormalized: false, allowMultiple: false });
      this.clusters.next({ options: { cdr3: '', top: 15, gene: 'Both', substring: false }, clusters: undefined, clustersNorm: undefined });

      this.isMetadataLoaded = true;
      this.isMetadataLoading = false;
    }
  }

  public setSearchState(state: MotifSearchState): void {
    this.state = state;
  }

  public getSearchState(): MotifSearchState {
    return this.state;
  }

  public getMetadata(): Observable<IMotifsMetadata> {
    return this.metadata.asObservable();
  }

  public getEpitopes(): Observable<IMotifEpitope[]> {
    return this.epitopes.asObservable();
  }

  public getSelected(): Observable<IMotifsMetadataTreeLevelValue[]> {
    return this.selected.asObservable();
  }

  public getEvents(): Observable<MotifsServiceEvents> {
    return this.events.asObservable();
  }

  public getOptions(): Observable<IMotifEpitopeViewOptions> {
    return this.options.asObservable();
  }

  public getCDR3Clusters(): Observable<IMotifCDR3SearchResult> {
    return this.clusters.asObservable();
  }

  public getCDR3SearchOptions(): Observable<IMotifCDR3SearchResultOptions> {
    return this.clusters.asObservable().pipe(map((c) => c.options));
  }

  public getHighlightedCid(): Observable<string | null> {
    return this.highlightedCid.asObservable();
  }

  public setOptions(options: IMotifEpitopeViewOptions): void {
    this.options.next(options);
  }

  public isLoaded(): boolean {
    return this.isMetadataLoaded;
  }

  public setLoading(value: boolean): void {
    this.loadingState.next(value);
  }

  public setLastEpitopeUrlParams(params: { [key: string]: string } | null): void {
    this.lastEpitopeUrlParams = params;
    if (params && params['epitope_seq']) {
      this.bridge.set({
        species:    params['species'],
        tcrChain:   params['tcr_chain'],
        mhcClass:   params['mhc_class'],
        gene:       params['gene'],
        epitopeSeq: params['epitope_seq']
      });
    }
  }

  public getLastEpitopeUrlParams(): { [key: string]: string } | null {
    return this.lastEpitopeUrlParams;
  }

  public getLastCDR3SearchOptions(): IMotifCDR3SearchResultOptions | null {
    return this.lastCDR3SearchOptions;
  }

  public getContentReady(): Observable<boolean> {
    return this.contentReady.asObservable();
  }

  public setContentReady(value: boolean): void {
    this.contentReady.next(value);
  }

  public fireScrollUpdateEvent(): void {
    this.events.next(MotifsServiceEvents.UPDATE_SCROLL);
  }

  public fireResizeUpdateEvent(): void {
    this.events.next(MotifsServiceEvents.UPDATE_RESIZE);
  }

  public fireHideEvent(): void {
    this.events.next(MotifsServiceEvents.HIDE_CLUSTERS);
  }

  public isLoading(): Observable<boolean> {
    return this.loadingState;
  }

  public async searchCDR3ByUrl(query: string, substring: boolean = false): Promise<void> {
    await this.load();
    this.setSearchState(MotifSearchState.SEARCH_CDR3);
    this.searchCDR3(query, substring);
  }

  public async filterByUrl(filters: { species: string, tcrChain: string, mhcClass: string, gene: string, epitopeSeq: string, cid?: string }): Promise<void> {
    await this.load();

    this.metadata.pipe(take(1)).subscribe((metadata) => {
      const speciesNode = metadata.root.values.find((v) => v.value === filters.species);
      if (!speciesNode) { return; }

      const tcrChainNode = speciesNode.next.values.find((v) => v.value === filters.tcrChain);
      if (!tcrChainNode) { return; }

      const mhcClassNode = tcrChainNode.next.values.find((v) => v.value === filters.mhcClass);
      if (!mhcClassNode) { return; }

      const geneNode = mhcClassNode.next.values.find((v) => v.value === filters.gene);
      if (!geneNode) { return; }

      const epitopeNode = geneNode.next.values.find((v) => v.value === filters.epitopeSeq);
      if (!epitopeNode) { return; }

      // Unpack the tree down to the linked epitope so its parent path is revealed on arrival.
      speciesNode.isOpened = true;
      tcrChainNode.isOpened = true;
      mhcClassNode.isOpened = true;
      geneNode.isOpened = true;

      this.selectTreeLevelValue(epitopeNode);
      this.updateSelected();
    });

    const treeFilter: IMotifsSearchTreeFilter = {
      entries: [
        { name: 'species', value: filters.species },
        { name: 'gene', value: filters.tcrChain },
        { name: 'mhc.class', value: filters.mhcClass },
        { name: 'mhc.a', value: filters.gene },
        { name: 'antigen.epitope', value: filters.epitopeSeq }
      ]
    };

    this.bridge.set({
      species:    filters.species,
      tcrChain:   filters.tcrChain,
      mhcClass:   filters.mhcClass,
      gene:       filters.gene,
      epitopeSeq: filters.epitopeSeq
    });
    this.highlightedCid.next(filters.cid || null);
    this.select(treeFilter);
  }

  public searchCDR3(cdr3: string, substring: boolean = false, gene: string = 'BOTH', top: number = 15): void {
    if (cdr3 === null || cdr3 === undefined || cdr3.length === 0) {
      this.notifications.warn('Motifs CDR3', 'Empty search input');
      return;
    }
    if (substring === true && cdr3.length < MotifService.minSubstringCDR3Length) {
      this.notifications.warn('Motifs CDR3', `Length of CDR3 substring should be greater of equal than ${MotifService.minSubstringCDR3Length}`);
      return;
    }
    // CDR3 search has no single selected epitope to carry across pages.
    this.bridge.clear();
    this.loadingState.next(true);
    Utils.HTTP.post('/api/motifs/cdr3', { cdr3, substring, gene, top, method: this.method }).then((response) => {
      const result = JSON.parse(response.response) as IMotifCDR3SearchResult;

      const comparator = (l: IMotifCDR3SearchEntry, r: IMotifCDR3SearchEntry) => {
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

      result.clusters.sort(comparator);
      result.clustersNorm.sort(comparator);

      this.lastCDR3SearchOptions = result.options;
      this.clusters.next(result);
      this.loadingState.next(false);
      this.notifications.info('Motifs CDR3', 'Loaded successfully', 1000); // tslint:disable-line:no-magic-numbers
    }).catch(() => {
      this.loadingState.next(false);
      this.notifications.error('Motifs CDR3', 'Unable to load results');
    });
  }

  public clearEpitopes(): void {
    this.epitopes.next([]);
  }

  public select(treeFilter: IMotifsSearchTreeFilter): void {
    this.updateSelected();
    this.loadingState.next(true);
    Utils.HTTP.post('/api/motifs/filter', { ...treeFilter, method: this.method }).then((response) => {
      const result = JSON.parse(response.response) as IMotifsSearchTreeFilterResult;
      this.epitopes.pipe(take(1)).subscribe((epitopes) => {
        const hashes = epitopes.map((epitope) => epitope.hash);
        const newEpitopes = result.epitopes.filter((epitope) => hashes.indexOf(epitope.hash) === -1);

        newEpitopes.forEach((n) => n.clusters.sort((l, r) => {
          if (l.size < r.size) {
            return 1;
          } else if (l.size > r.size) {
            return -1;
          } else {
            return 0;
          }
        }));

        this.epitopes.next([ ...epitopes, ...newEpitopes ]);
        this.loadingState.next(false);
        this.notifications.info('Motifs', 'Loaded successfully', 1000); // tslint:disable-line:no-magic-numbers
      });
    }).catch(() => {
      this.loadingState.next(false);
      this.notifications.error('Motifs', 'Unable to load results');
    });
  }

  public members(cid: string): void {
    Utils.HTTP.post('/api/motifs/members', { cid, format: 'tsv', method: this.method }).then((response) => {
      const result = JSON.parse(response.response) as IMotifClusterMembersExportResponse;
      Utils.File.download(result.link);
      this.notifications.info('Motifs export', 'Download will start automatically');
    }).catch(() => {
      this.notifications.error('Motifs', 'Unable to export results');
    });
  }

  public discard(_: IMotifsSearchTreeFilter): void {
    this.updateSelected();
    setImmediate(() => {
      this.updateEpitopes();
    });
  }

  public isTreeLevelValueSelected(value: IMotifsMetadataTreeLevelValue): boolean {
    if (value.next !== null) {
      return value.next.values.reduce((previous, current) => previous && this.isTreeLevelValueSelected(current), true);
    } else {
      return value.isSelected;
    }
  }

  public selectTreeLevelValue(value: IMotifsMetadataTreeLevelValue): void {
    if (value.next !== null) {
      value.next.values.forEach((v) => {
        this.selectTreeLevelValue(v);
      });
    } else {
      value.isSelected = true;
    }
  }

  public discardTreeLevelValue(value: IMotifsMetadataTreeLevelValue): void {
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
      const selectedValues = MotifService.extractMetadataTreeLeafValues(metadata.root)
          .filter(([ _, value ]) => value.isSelected)
          .map(([ _, value ]) => value);
      this.selected.next(selectedValues);
      if (selectedValues.length === 0) {
        // Full deselection — drop the cross-page epitope memory.
        this.bridge.clear();
      }
      this.events.next(MotifsServiceEvents.UPDATE_SELECTED);
      setTimeout(() => {
        this.events.next(MotifsServiceEvents.UPDATE_SCROLL);
      }, 100); // tslint:disable-line:no-magic-numbers
    });
  }

  public updateEpitopes(): void {
    combineLatest(this.selected, this.epitopes).pipe(take(1)).subscribe(([ selected, epitopes ]) => {
      const selectedEpitopeHashes = selected.map((s) => s.hash);
      const remainingEpitopes = epitopes.filter((e) => selectedEpitopeHashes.indexOf(e.hash) !== -1);
      this.epitopes.next(remainingEpitopes);
    });
  }

  // Resolve a (possibly cross-page) epitope descriptor against the currently
  // loaded metadata tree, returning the URL params for the matching leaf or null
  // if this method/page does not contain that epitope. Matching is best-effort:
  // epitope sequence + MHC class are required; MHC head and species/chain refine
  // when provided. Used to keep a selection across the tcrnet/tcremp switch and
  // when arriving from the Structure page.
  public resolveEpitopeParams(target: IBridgeEpitope): Observable<{ [key: string]: string } | null> {
    return this.metadata.pipe(take(1), map((metadata) => {
      const wantEpitope = target.epitopeSeq.toLowerCase();
      const wantClass = target.mhcClass.toLowerCase();
      const wantHead = EpitopeBridgeService.mhcHead(target.gene);
      for (const speciesNode of metadata.root.values) {
        if (target.species && speciesNode.value.toLowerCase() !== target.species.toLowerCase()) { continue; }
        if (!speciesNode.next) { continue; }
        for (const chainNode of speciesNode.next.values) {
          if (target.tcrChain && chainNode.value.toLowerCase() !== target.tcrChain.toLowerCase()) { continue; }
          if (!chainNode.next) { continue; }
          for (const classNode of chainNode.next.values) {
            if (classNode.value.toLowerCase() !== wantClass) { continue; }
            if (!classNode.next) { continue; }
            for (const geneNode of classNode.next.values) {
              if (wantHead && EpitopeBridgeService.mhcHead(geneNode.value) !== wantHead) { continue; }
              if (!geneNode.next) { continue; }
              for (const epitopeNode of geneNode.next.values) {
                if (epitopeNode.value.toLowerCase() === wantEpitope) {
                  return {
                    method:      this.method,
                    species:     speciesNode.value,
                    tcr_chain:   chainNode.value,
                    mhc_class:   classNode.value,
                    gene:        geneNode.value,
                    epitope_seq: epitopeNode.value
                  };
                }
              }
            }
          }
        }
      }
      return null;
    }));
  }

  // Read the full URL params of every currently-selected epitope leaf straight
  // from the tree's isSelected flags. This is the source of truth for the active
  // selection (single or multiple) — unlike lastEpitopeUrlParams, which the tree
  // stops maintaining once "multiple epitopes" mode is on.
  public getSelectedEpitopeParams(): Observable<Array<{ [key: string]: string }>> {
    return this.metadata.pipe(take(1), map((metadata) => {
      const out: Array<{ [key: string]: string }> = [];
      for (const speciesNode of metadata.root.values) {
        if (!speciesNode.next) { continue; }
        for (const chainNode of speciesNode.next.values) {
          if (!chainNode.next) { continue; }
          for (const classNode of chainNode.next.values) {
            if (!classNode.next) { continue; }
            for (const geneNode of classNode.next.values) {
              if (!geneNode.next) { continue; }
              for (const epitopeNode of geneNode.next.values) {
                if (epitopeNode.isSelected) {
                  out.push({
                    species:     speciesNode.value,
                    tcr_chain:   chainNode.value,
                    mhc_class:   classNode.value,
                    gene:        geneNode.value,
                    epitope_seq: epitopeNode.value
                  });
                }
              }
            }
          }
        }
      }
      return out;
    }));
  }

  public findTreeLevelValue(hash: string): Observable<IMotifsMetadataTreeLevelValue[]> {
    return this.metadata.pipe(take(1), map((metadata) => {
      return MotifService.extractMetadataTreeLeafValues(metadata.root)
          .filter(([ h, _ ]) => h === hash)
          .map(([ _, value ]) => value);
    }));
  }

  private static extractMetadataTreeLeafValues(tree: IMotifsMetadataTreeLevel): Array<[ string, IMotifsMetadataTreeLevelValue ]> {
    return Utils.Array.flattened(tree.values.map((v) => {
      if (v.next === null) {
        return [ [ v.hash, v ] ] as Array<[ string, IMotifsMetadataTreeLevelValue ]>;
      } else {
        return MotifService.extractMetadataTreeLeafValues(v.next);
      }
    }));
  }

}

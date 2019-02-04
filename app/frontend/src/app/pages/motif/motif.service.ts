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
  IMotifCDR3SearchResult, IMotifCDR3SearchResultOptions,
  IMotifClusterMembersExportResponse,
  IMotifEpitope,
  IMotifEpitopeViewOptions,
  IMotifsMetadata,
  IMotifsMetadataTreeLevel,
  IMotifsMetadataTreeLevelValue,
  IMotifsSearchTreeFilter,
  IMotifsSearchTreeFilterResult
} from 'pages/motif/motif';
import { combineLatest, Observable, ReplaySubject, Subject } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ISeqLogoChartConfiguration } from 'shared/charts/seqlogo/seqlogo-configuration';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';
import { Utils } from 'utils/utils';

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

@Injectable()
export class MotifService {
  public static readonly minSubstringCDR3Length: number = 3;
  public static readonly clusterViewportChartConfiguration: ISeqLogoChartConfiguration = {
    container: { height: 150 }
  };

  private isMetadataLoaded: boolean = false;
  private isMetadataLoading: boolean = false;

  private state: MotifSearchState = MotifSearchState.SEARCH_TREE;

  private events: Subject<MotifsServiceEvents> = new Subject<MotifsServiceEvents>();
  private metadata: Subject<IMotifsMetadata> = new ReplaySubject(1);
  private selected: Subject<IMotifsMetadataTreeLevelValue[]> = new ReplaySubject(1);
  private epitopes: Subject<IMotifEpitope[]> = new ReplaySubject(1);
  private options: Subject<IMotifEpitopeViewOptions> = new ReplaySubject(1);

  private clusters: Subject<IMotifCDR3SearchResult> = new ReplaySubject(1);

  private loadingState: Subject<boolean> = new ReplaySubject(1);

  constructor(private logger: LoggerService, private notifications: NotificationService) {}

  public async load(): Promise<void> {
    if (!this.isMetadataLoaded && !this.isMetadataLoading) {
      this.isMetadataLoading = true;
      const response = await Utils.HTTP.get('/api/motifs/metadata');
      const root = JSON.parse(response.response) as { root: IMotifsMetadataTreeLevel };
      const metadata = { root: root.root };
      this.logger.debug('Motifs metadata', metadata);

      metadata.root.values.forEach((value) => value.isOpened = true);

      this.metadata.next(metadata);
      this.selected.next([]);
      this.epitopes.next([]);
      this.options.next({ isNormalized: false });
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

  public setOptions(options: IMotifEpitopeViewOptions): void {
    this.options.next(options);
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

  public searchCDR3(cdr3: string, substring: boolean = false, gene: string = 'BOTH', top: number = 15): void {
    if (cdr3 === null || cdr3 === undefined || cdr3.length === 0) {
      this.notifications.warn('Motifs CDR3', 'Empty search input');
      return;
    }
    if (substring === true && cdr3.length < MotifService.minSubstringCDR3Length) {
      this.notifications.warn('Motifs CDR3', `Length of CDR3 substring should be greater of equal than ${MotifService.minSubstringCDR3Length}`);
      return;
    }
    this.loadingState.next(true);
    Utils.HTTP.post('/api/motifs/cdr3', { cdr3, substring, gene, top }).then((response) => {
      const result = JSON.parse(response.response) as IMotifCDR3SearchResult;
      this.clusters.next(result);
      this.loadingState.next(false);
      this.notifications.info('Motifs CDR3', 'Loaded successfully', 1000); // tslint:disable-line:no-magic-numbers
    }).catch(() => {
      this.loadingState.next(false);
      this.notifications.error('Motifs CDR3', 'Unable to load results');
    });
  }

  public select(treeFilter: IMotifsSearchTreeFilter): void {
    this.updateSelected();
    this.loadingState.next(true);
    Utils.HTTP.post('/api/motifs/filter', treeFilter).then((response) => {
      const result = JSON.parse(response.response) as IMotifsSearchTreeFilterResult;
      this.epitopes.pipe(take(1)).subscribe((epitopes) => {
        const hashes = epitopes.map((epitope) => epitope.hash);
        const newEpitopes = result.epitopes.filter((epitope) => hashes.indexOf(epitope.hash) === -1);
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
    Utils.HTTP.post('/api/motifs/members', { cid, format: 'tsv' }).then((response) => {
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
      this.selected.next(MotifService.extractMetadataTreeLeafValues(metadata.root)
        .filter(([ _, value ]) => value.isSelected)
        .map(([ _, value ]) => value)
      );
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

/*
 *     Copyright 2017-2018 Bagaev Dmitry
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


import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MotifCDR3SearchResult, MotifEpitope, MotifEpitopeViewOptions, MotifsMetadata, MotifsMetadataTreeLevelValue } from 'pages/motif/motif';
import { MotifSearchState, MotifService } from 'pages/motif/motif.service';
import { fromEvent, Observable, Subscription, timer } from 'rxjs';
import { debounce } from 'rxjs/operators';
import { ContentWrapperService } from '../../content-wrapper.service';

@Component({
  selector:        'motif',
  templateUrl:     './motif.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifPageComponent implements OnInit, OnDestroy {
  private onScrollObservable: Subscription;
  private onResizeObservable: Subscription;

  public readonly metadata: Observable<MotifsMetadata>;
  public readonly selected: Observable<Array<MotifsMetadataTreeLevelValue>>;
  public readonly epitopes: Observable<Array<MotifEpitope>>;
  public readonly clusters: Observable<MotifCDR3SearchResult>;
  public readonly cdr3: Observable<string>;
  public readonly options: Observable<MotifEpitopeViewOptions>;

  @ViewChild('EpitopesContainer')
  public EpitopesContainer: ElementRef;

  constructor(private motifService: MotifService, private contentWrapper: ContentWrapperService) {
    this.metadata = motifService.getMetadata();
    this.selected = motifService.getSelected();
    this.epitopes = motifService.getEpitopes();
    this.clusters = motifService.getCDR3Clusters();
    this.cdr3 = motifService.getCDR3SearchInput();
    this.options = motifService.getOptions();
  }

  public ngOnInit(): void {
    // noinspection JSIgnoredPromiseFromCall
    this.contentWrapper.blockScrolling();
    this.motifService.load();
    this.onScrollObservable = fromEvent(this.EpitopesContainer.nativeElement, 'scroll')
      .pipe(debounce(() => timer(5))).subscribe(() => {
        this.motifService.fireScrollUpdateEvent();
      });

    this.onResizeObservable = fromEvent(window, 'resize').pipe(debounce(() => timer(200))).subscribe(() => {
      this.motifService.fireResizeUpdateEvent();
    });
  }

  public isEpitopesLoading(): Observable<boolean> {
    return this.motifService.isLoading();
  }

  public setOptions(options: MotifEpitopeViewOptions): void {
    this.motifService.setOptions(options);
  }

  public ngOnDestroy(): void {
    this.contentWrapper.unblockScrolling();
    this.onScrollObservable.unsubscribe();
    this.onResizeObservable.unsubscribe();
  }

  public isStateSearchTree(): boolean {
    return this.motifService.getSearchState() === MotifSearchState.SEARCH_TREE;
  }

  public isStateSearchCDR3(): boolean {
    return this.motifService.getSearchState() === MotifSearchState.SEARCH_CDR3;
  }

}


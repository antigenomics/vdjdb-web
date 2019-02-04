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

import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
  IMotifCDR3SearchResult,
  IMotifCDR3SearchResultOptions,
  IMotifEpitope,
  IMotifEpitopeViewOptions,
  IMotifsMetadata,
  IMotifsMetadataTreeLevelValue
} from 'pages/motif/motif';
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
  private static readonly motifPageScrollEventDebounceTimeout: number = 10;
  private static readonly motifPageResizeEventDebounceTimeout: number = 200;

  private onScrollObservable: Subscription;
  private onResizeObservable: Subscription;

  public readonly metadata: Observable<IMotifsMetadata>;
  public readonly selected: Observable<IMotifsMetadataTreeLevelValue[]>;
  public readonly epitopes: Observable<IMotifEpitope[]>;
  public readonly options: Observable<IMotifEpitopeViewOptions>;
  public readonly clusters: Observable<IMotifCDR3SearchResult>;
  public readonly cdr3SearchOptions: Observable<IMotifCDR3SearchResultOptions>;

  @ViewChild('EpitopesContainer')
  public epitopesContainer: ElementRef;

  constructor(private motifService: MotifService, private contentWrapper: ContentWrapperService) {
    this.metadata = motifService.getMetadata();
    this.selected = motifService.getSelected();
    this.epitopes = motifService.getEpitopes();
    this.options = motifService.getOptions();
    this.clusters = motifService.getCDR3Clusters();
    this.cdr3SearchOptions = motifService.getCDR3SearchOptions();
  }

  public ngOnInit(): void {
    // noinspection JSIgnoredPromiseFromCall
    this.contentWrapper.blockScrolling();
    this.motifService.load();
    this.onScrollObservable = fromEvent(this.epitopesContainer.nativeElement, 'scroll')
      .pipe(debounce(() => timer(MotifPageComponent.motifPageScrollEventDebounceTimeout))).subscribe(() => {
        this.motifService.fireScrollUpdateEvent();
      });

    this.onResizeObservable = fromEvent(window, 'resize')
      .pipe(debounce(() => timer(MotifPageComponent.motifPageResizeEventDebounceTimeout))).subscribe(() => {
        this.motifService.fireResizeUpdateEvent();
      });
  }

  public isEpitopesLoading(): Observable<boolean> {
    return this.motifService.isLoading();
  }

  public setOptions(options: IMotifEpitopeViewOptions): void {
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

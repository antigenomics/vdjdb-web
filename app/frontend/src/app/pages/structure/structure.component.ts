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

import { AfterViewInit, ChangeDetectionStrategy, Component, DoCheck, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IStructureCDR3SearchResult,
  IStructureCDR3SearchResultOptions,
  IStructureEpitope,
  IStructureEpitopeViewOptions,
  IStructuresMetadata,
  IStructuresMetadataTreeLevelValue
} from 'pages/structure/structure';
import { StructureSearchState } from 'pages/structure/structure.service';
import { StructureService } from 'pages/structure/structure.service';
import { fromEvent, Observable, Subscription, timer } from 'rxjs';
import { debounce, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ContentWrapperService } from '../../content-wrapper.service';

@Component({
  selector:        'structure',
  templateUrl:     './structure.component.html',
  styleUrls:       [ './structure.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StructurePageComponent implements OnInit, OnDestroy, DoCheck, AfterViewInit {
  private static readonly pageScrollEventDebounceTimeout: number = 10;
  private static readonly pageResizeEventDebounceTimeout: number = 200;

  private onScrollObservable: Subscription;
  private onResizeObservable: Subscription;
  private routeSubscription: Subscription;
  private destroy$ = new Subject<void>();
  private lastFilterSignature: string | null = null;
  private lastHighlightHash: string | null = null;
  private lastSearchState: StructureSearchState | null = null;

  public readonly metadata: Observable<IStructuresMetadata>;
  public readonly selected: Observable<IStructuresMetadataTreeLevelValue[]>;
  public readonly epitopes: Observable<IStructureEpitope[]>;
  public readonly options: Observable<IStructureEpitopeViewOptions>;
  public readonly clusters: Observable<IStructureCDR3SearchResult>;
  public readonly cdr3SearchOptions: Observable<IStructureCDR3SearchResultOptions>;
  public stickyHeaderOffsetPx: number = 0;

  @ViewChild('EpitopesContainer')
  public epitopesContainer: ElementRef;

  constructor(private structureService: StructureService, private contentWrapper: ContentWrapperService,
              private route: ActivatedRoute, private router: Router) {
    this.metadata = structureService.getMetadata();
    this.selected = structureService.getSelected();
    this.epitopes = structureService.getEpitopes();
    this.options = structureService.getOptions();
    this.clusters = structureService.getCDR3Clusters();
    this.cdr3SearchOptions = structureService.getCDR3SearchOptions();
  }

  public ngOnInit(): void {
    this.routeSubscription = this.route.queryParamMap.subscribe((params) => {
      const species = params.get('species') || '';
      const tcrChain = params.get('tcr_chain') || '';
      const gene = params.get('gene');
      const mhcClass = params.get('mhc_class');
      const epitopeSeq = params.get('epitope_seq');
      const tcrHash = params.get('tcr_hash');
      const cdr3Query = params.get('query');
      const substringParam = params.get('substring');
      const cdr3ChainParam = params.get('cdr3_chain');
      const substring = substringParam === '1' || substringParam === 'true';
      const cdr3Gene = this.resolveCdr3Gene(cdr3ChainParam);

      const filterSignature = [
        species,
        tcrChain,
        gene || '',
        mhcClass || '',
        epitopeSeq || '',
        cdr3Query || '',
        substring ? '1' : '0',
        cdr3Gene
      ].join('|');

      const hashChanged = tcrHash !== this.lastHighlightHash;

      if (filterSignature === this.lastFilterSignature) {
        // Filter params unchanged — only update highlight if tcr_hash changed
        if (hashChanged) {
          this.lastHighlightHash = tcrHash;
          this.structureService.setHighlightedClusterIdx(tcrHash ? tcrHash.toLowerCase() : null);
        }
        return;
      }
      this.lastFilterSignature = filterSignature;
      this.lastHighlightHash = tcrHash;

      if (mhcClass && gene && epitopeSeq) {
        this.structureService.filterByUrl({
          species,
          tcrChain,
          mhcClass,
          gene,
          epitopeSeq,
          tcrHash: tcrHash || undefined
        });
        return;
      }

      if (cdr3Query) {
        this.structureService.searchCDR3ByUrl(cdr3Query, substring, cdr3Gene);
      } else {
        this.structureService.load();
      }
    });

    this.onScrollObservable = fromEvent(window, 'scroll')
        .pipe(debounce(() => timer(StructurePageComponent.pageScrollEventDebounceTimeout))).subscribe(() => {
          this.structureService.fireScrollUpdateEvent();
        });

    this.onResizeObservable = fromEvent(window, 'resize')
        .pipe(debounce(() => timer(StructurePageComponent.pageResizeEventDebounceTimeout))).subscribe(() => {
          this.updateStickyHeaderOffset();
          this.structureService.fireResizeUpdateEvent();
        });

    this.syncScrollBlocking();

    this.structureService.getSelectedClusterIds().pipe(takeUntil(this.destroy$)).subscribe((ids) => {
      const cid = ids.length > 0 ? ids.join(',') : null;
      this.router.navigate([], { queryParams: { cid, tcr_hash: null }, queryParamsHandling: 'merge', replaceUrl: true });
    });
  }

  public ngAfterViewInit(): void {
    this.updateStickyHeaderOffset();
  }

  public ngDoCheck(): void {
    this.syncScrollBlocking();
  }

  public isEpitopesLoading(): Observable<boolean> {
    return this.structureService.isLoading();
  }

  public ngOnDestroy(): void {
    this.contentWrapper.unblockScrolling();
    this.onScrollObservable.unsubscribe();
    this.onResizeObservable.unsubscribe();
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  public isStateSearchTree(): boolean {
    return this.structureService.getSearchState() === StructureSearchState.SEARCH_TREE;
  }

  public isStateSearchCDR3(): boolean {
    return this.structureService.getSearchState() === StructureSearchState.SEARCH_CDR3;
  }

  private syncScrollBlocking(): void {
    const nextState = this.structureService.getSearchState();
    if (this.lastSearchState === nextState) {
      return;
    }
    this.lastSearchState = nextState;
    this.contentWrapper.unblockScrolling();
  }

  private resolveCdr3Gene(chainParam: string | null): string {
    switch ((chainParam || '').toLowerCase()) {
      case 'a':
        return 'TRA';
      case 'b':
        return 'TRB';
      case 'ab':
        return 'BOTH';
      default:
        return 'TRA';
    }
  }

  private updateStickyHeaderOffset(): void {
    const topMenu = document.querySelector('.ui.top.fixed.borderless.inverted.menu.large') as HTMLElement | null;
    const nextOffset = topMenu ? Math.max(0, Math.round(topMenu.getBoundingClientRect().height)) : 0;
    if (this.stickyHeaderOffsetPx !== nextOffset) {
      this.stickyHeaderOffsetPx = nextOffset;
    }
  }
}

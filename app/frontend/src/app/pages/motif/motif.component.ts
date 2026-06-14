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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IMotifCDR3SearchResult,
  IMotifCDR3SearchResultOptions,
  IMotifEpitope,
  IMotifEpitopeViewOptions,
  IMotifsMetadata,
  IMotifsMetadataTreeLevelValue
} from 'pages/motif/motif';
import { MotifMethod, MotifSearchState, MotifService } from 'pages/motif/motif.service';
import { fromEvent, Observable, Subscription, timer } from 'rxjs';
import { debounce, take } from 'rxjs/operators';
import { ContentWrapperService } from '../../content-wrapper.service';
import { EpitopeBridgeService } from '../../epitope-bridge.service';

@Component({
  selector:        'motif',
  templateUrl:     './motif.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifPageComponent implements OnInit, OnDestroy {
  private static readonly pageScrollEventDebounceTimeout: number = 10;
  private static readonly motifPageResizeEventDebounceTimeout: number = 200;

  private onScrollObservable!: Subscription;
  private onResizeObservable!: Subscription;

  public readonly metadata: Observable<IMotifsMetadata>;
  public readonly selected: Observable<IMotifsMetadataTreeLevelValue[]>;
  public readonly epitopes: Observable<IMotifEpitope[]>;
  public readonly options: Observable<IMotifEpitopeViewOptions>;
  public readonly clusters: Observable<IMotifCDR3SearchResult>;
  public readonly cdr3SearchOptions: Observable<IMotifCDR3SearchResultOptions>;
  public contentReady: boolean = true;

  @ViewChild('EpitopesContainer')
  public epitopesContainer!: ElementRef;

  constructor(private motifService: MotifService, private contentWrapper: ContentWrapperService,
              private route: ActivatedRoute, private router: Router, private cdr: ChangeDetectorRef,
              private epitopeBridge: EpitopeBridgeService) {
    this.metadata = motifService.getMetadata();
    this.selected = motifService.getSelected();
    this.epitopes = motifService.getEpitopes();
    this.options = motifService.getOptions();
    this.clusters = motifService.getCDR3Clusters();
    this.cdr3SearchOptions = motifService.getCDR3SearchOptions();
  }

  public ngOnInit(): void {
    // The page flows naturally and scrolls the whole document (like Browse), so the navbar
    // auto-hides on body scroll here too — do NOT block whole-page scrolling.

    this.route.queryParamMap.pipe(take(1)).subscribe(async (params) => {
      const urlMethod = (params.get('method') || 'tcrnet') as MotifMethod;
      if (!params.get('method')) {
        this.router.navigate([], { queryParams: { method: urlMethod }, queryParamsHandling: 'merge', replaceUrl: true });
      }
      if (urlMethod !== this.motifService.getMethod()) {
        await this.motifService.switchMethod(urlMethod);
      }

      const species = params.get('species');
      const tcrChain = params.get('tcr_chain');
      const gene = params.get('gene');
      const mhcClass = params.get('mhc_class');
      const epitopeSeq = params.get('epitope_seq');
      const cid = params.get('cid') || undefined;

      if (species && tcrChain && mhcClass && gene && epitopeSeq) {
        this.motifService.filterByUrl({ species, tcrChain, mhcClass, gene, epitopeSeq, cid });
      } else {
        const cdr3Query = params.get('query');
        if (cdr3Query) {
          const cdr3Substring = params.get('substring') === 'true';
          this.motifService.searchCDR3ByUrl(cdr3Query, cdr3Substring);
        } else if (this.motifService.isLoaded() && this.hasOwnSelection()) {
          // Returning to tab with cached state — hide content, show loader, restore URL,
          // then reveal content after browser paints the loader
          this.motifService.setContentReady(false);
          this.motifService.setLoading(true);

          const method = this.motifService.getMethod();
          const state = this.motifService.getSearchState();
          if (state === MotifSearchState.SEARCH_CDR3) {
            const opts = this.motifService.getLastCDR3SearchOptions();
            if (opts && opts.cdr3) {
              this.router.navigate([], {
                queryParams: { method, query: opts.cdr3, substring: opts.substring ? 'true' : null },
                replaceUrl: true
              });
            }
          } else {
            const epitopeParams = this.motifService.getLastEpitopeUrlParams();
            if (epitopeParams) {
              this.router.navigate([], { queryParams: { method, ...epitopeParams }, replaceUrl: true });
            }
          }

          requestAnimationFrame(() => {
            this.motifService.setContentReady(true);
            this.motifService.setLoading(false);
          });
        } else {
          // Nothing of our own to show — carry over the epitope selected on the
          // Structure page (if any), otherwise just load the empty tree.
          this.applyBridgeOrLoad();
        }
      }
    });

    // Body-scroll layout: lazy chart rendering is driven by window scroll (isInViewport() is
    // measured against the viewport), matching how the page now grows with its content.
    this.onScrollObservable = fromEvent(window, 'scroll')
        .pipe(debounce(() => timer(MotifPageComponent.pageScrollEventDebounceTimeout))).subscribe(() => {
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

  public getCurrentMethod(): MotifMethod {
    return this.motifService.getMethod();
  }

  public setMethod(method: MotifMethod): void {
    if (method === this.motifService.getMethod()) {
      return;
    }
    // Capture the current selection BEFORE switching — switchMethod() clears it
    // synchronously. We re-apply it on the new method (for the epitopes that exist
    // there) instead of dropping back to "nothing selected". Read the selection
    // straight from the tree so it is correct even after "multiple epitopes" mode.
    const prevState = this.motifService.getSearchState();
    const prevCdr3 = this.motifService.getLastCDR3SearchOptions();
    let prevEpitopes: Array<{ [key: string]: string }> = [];
    this.motifService.getSelectedEpitopeParams().pipe(take(1)).subscribe((list) => { prevEpitopes = list; });

    this.motifService.switchMethod(method).then(() => {
      if (prevState === MotifSearchState.SEARCH_CDR3 && prevCdr3 && prevCdr3.cdr3) {
        this.router.navigate([], {
          queryParams: { method, query: prevCdr3.cdr3, substring: prevCdr3.substring ? 'true' : null },
          replaceUrl: true
        });
        this.motifService.searchCDR3ByUrl(prevCdr3.cdr3, prevCdr3.substring);
        this.cdr.markForCheck();
      } else if (prevEpitopes.length > 0) {
        // Keep only the epitopes that also exist under the new method (resolve
        // against its freshly loaded tree). metadata is a ReplaySubject, so each
        // resolve emits synchronously here.
        const resolved: Array<{ [key: string]: string }> = [];
        prevEpitopes.forEach((p) => {
          this.motifService.resolveEpitopeParams({
            species:    p['species'],
            tcrChain:   p['tcr_chain'],
            mhcClass:   p['mhc_class'],
            gene:       p['gene'],
            epitopeSeq: p['epitope_seq']
          }).pipe(take(1)).subscribe((r) => { if (r) { resolved.push(r); } });
        });

        if (resolved.length === 0) {
          this.router.navigate([], { queryParams: { method }, replaceUrl: true });
        } else if (resolved.length === 1) {
          this.router.navigate([], { queryParams: resolved[0], replaceUrl: true });
          this.motifService.filterByUrl(this.toEpitopeFilter(resolved[0]));
        } else {
          // Multiple epitopes can't live in the URL — turn the mode on and append
          // each one, mirroring how the tree builds a multi-selection.
          this.motifService.setOptions({ isNormalized: false, allowMultiple: true });
          this.router.navigate([], { queryParams: { method }, replaceUrl: true });
          resolved.forEach((r) => this.motifService.filterByUrl(this.toEpitopeFilter(r)));
        }
        this.cdr.markForCheck();
      } else {
        this.router.navigate([], { queryParams: { method }, replaceUrl: true });
        this.cdr.markForCheck();
      }
    });
  }

  private toEpitopeFilter(p: { [key: string]: string }): { species: string, tcrChain: string, mhcClass: string, gene: string, epitopeSeq: string } {
    return {
      species:    p['species'],
      tcrChain:   p['tcr_chain'],
      mhcClass:   p['mhc_class'],
      gene:       p['gene'],
      epitopeSeq: p['epitope_seq']
    };
  }

  private hasOwnSelection(): boolean {
    const cdr3 = this.motifService.getLastCDR3SearchOptions();
    if (this.motifService.getSearchState() === MotifSearchState.SEARCH_CDR3 && cdr3 && cdr3.cdr3) {
      return true;
    }
    const epitope = this.motifService.getLastEpitopeUrlParams();
    return !!(epitope && epitope['epitope_seq']);
  }

  // No selection of our own: re-open the epitope carried over from the Structure
  // page (matched against this method's tree) if there is one; otherwise load the
  // empty tree. Only fills when this page is empty — it never overrides a selection.
  private applyBridgeOrLoad(): void {
    const bridge = this.epitopeBridge.get();
    const apply = () => {
      if (!bridge) { return; }
      this.motifService.resolveEpitopeParams(bridge).pipe(take(1)).subscribe((resolved) => {
        if (resolved) {
          this.router.navigate([], { queryParams: resolved, replaceUrl: true });
          this.motifService.filterByUrl({
            species:    resolved['species'],
            tcrChain:   resolved['tcr_chain'],
            mhcClass:   resolved['mhc_class'],
            gene:       resolved['gene'],
            epitopeSeq: resolved['epitope_seq']
          });
        }
      });
    };
    if (this.motifService.isLoaded()) {
      apply();
    } else {
      this.motifService.load().then(apply);
    }
  }

  public isStateSearchTree(): boolean {
    return this.motifService.getSearchState() === MotifSearchState.SEARCH_TREE;
  }

  public isStateSearchCDR3(): boolean {
    return this.motifService.getSearchState() === MotifSearchState.SEARCH_CDR3;
  }

}

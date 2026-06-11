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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { IMotifCluster, IMotifClusterMeta, IMotifEpitope } from 'pages/motif/motif';
import { MotifService, MotifsServiceEvents } from 'pages/motif/motif.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Utils } from 'utils/utils';

/** Native aspect ratio of Plotly chart exports (width / height). */
const CHART_ASPECT = 10 / 7;

@Component({
  selector:        'motif-epitope-entry',
  templateUrl:     './motif-epitope-entry.component.html',
  styleUrls:       [ './motif-epitope-entry.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifEpitopeEntryComponent implements OnInit, OnDestroy {
  private static readonly hideScrollEventUpdateTimeout: number = 50;

  private subscription: Subscription;
  private destroy$ = new Subject<void>();
  private chartResizeObserver?: { observe(target: Element): void; disconnect(): void };
  private chartResizeHandler?: () => void;

  public meta: IMotifClusterMeta;
  public isHidden: boolean = false;
  public highlightedCid: string | null = null;
  public chartUrl: SafeResourceUrl | null = null;
  public isChartLoading: boolean = false;
  public chartWidth: number = 0;
  public chartHeight: number = 0;

  @ViewChild('chartHost')
  public set chartHostRef(ref: ElementRef<HTMLElement> | undefined) {
    this.detachChartResize();
    if (ref) {
      this.attachChartResize(ref.nativeElement);
    }
  }

  @Input('epitope')
  public epitope: IMotifEpitope;

  @Input('isNormalized')
  public isNormalized: boolean;

  @Input('allowMultiple')
  public allowMultiple: boolean = true;

  @Input('hasMultipleSelected')
  public hasMultipleSelected: boolean = false;

  @Output('onDiscard')
  public onDiscard = new EventEmitter<IMotifEpitope>();

  constructor(private motifService: MotifService, private changeDetector: ChangeDetectorRef,
              private sanitizer: DomSanitizer) {}

  public ngOnInit(): void {
    this.meta = this.epitope.clusters[ 0 ].meta;
    this.subscription = this.motifService.getEvents().pipe(filter((event) => event === MotifsServiceEvents.HIDE_CLUSTERS)).subscribe(() => {
      this.isHidden = true;
      this.changeDetector.markForCheck();
    });
    this.motifService.getHighlightedCid().pipe(takeUntil(this.destroy$)).subscribe((cid) => {
      this.highlightedCid = cid;
      this.changeDetector.markForCheck();
    });
    if (!this.allowMultiple) {
      this.loadChartIfAvailable();
    }
  }

  /**
   * TCRNet: /motif-files/tcrnet/{species}_{gene}_{epitope}.html
   * TCREMP: /motif-files/tcremp/{species}_{epitope}_{gene}.html
   */
  public static resolveMotifChartUrl(species: string, gene: string, epitope: string, method: string): string {
    const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (method === 'tcremp') {
      return `/motif-files/tcremp/${n(species)}_${n(epitope)}_${n(gene)}.html`;
    }
    return `/motif-files/tcrnet/${n(species)}_${n(gene)}_${n(epitope)}.html`;
  }

  public onChartIframeLoad(event: Event): void {
    const iframe = event.target as HTMLIFrameElement;
    try {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow as any;
      if (!doc || !doc.head) { return; }

      // remove body margins so content fills the iframe exactly
      const style = doc.createElement('style');
      // hide the Plotly chart title (.gtitle) — it duplicates the epitope shown in the panel header above
      style.textContent = 'html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; height: 100% !important; overflow: hidden !important; } .gtitle { display: none !important; }';
      doc.head.appendChild(style);

      // override the hardcoded inline dimensions on the plotly div
      // TCRNet uses id="plot-...", TCREMP uses class="plotly-graph-div"
      const plotDiv = (doc.querySelector('.plotly-graph-div') ? doc.querySelector('.plotly-graph-div') : doc.querySelector('[id^="plot-"]')) as HTMLElement;
      if (plotDiv) {
        plotDiv.style.width = '100%';
        plotDiv.style.height = '100%';
      }

      // relayout with autosize + tighter margins, then force resize
      if (win && win.Plotly && plotDiv) {
        win.Plotly.relayout(plotDiv, {
          autosize: true,
          'title.text': '',
          'margin.l': 30,
          'margin.r': 10,
          'margin.t': 10,
          'margin.b': 30
        }).then(() => {
          win.Plotly.Plots.resize(plotDiv);
        });
      } else if (win) {
        win.dispatchEvent(new Event('resize'));
      }
    } catch (_) {}
  }

  public discard(): void {
    this.onDiscard.emit(this.epitope);
  }

  public hide(): void {
    this.isHidden = !this.isHidden;
    setTimeout(() => {
      this.motifService.fireScrollUpdateEvent();
    }, MotifEpitopeEntryComponent.hideScrollEventUpdateTimeout);
  }

  public trackClusterBy(_: number, item: IMotifCluster): string {
    return item.clusterId;
  }

  public ngOnDestroy(): void {
    this.detachChartResize();
    this.subscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── chart sizing ──────────────────────────────────────────

  private attachChartResize(el: HTMLElement): void {
    const update = () => {
      const containerW = el.getBoundingClientRect().width || el.offsetWidth;
      if (containerW <= 0) { return; }

      const topMenu = document.querySelector('.ui.top.fixed.borderless.inverted.menu.large') as HTMLElement | null;
      const menuH = topMenu ? topMenu.getBoundingClientRect().height : 0;
      const availableH = Math.max(200, window.innerHeight - menuH - 20);

      const w = Math.min(containerW, availableH * CHART_ASPECT);
      const h = Math.round(w / CHART_ASPECT);

      if (this.chartWidth !== Math.round(w) || this.chartHeight !== h) {
        this.chartWidth = Math.round(w);
        this.chartHeight = h;
        this.changeDetector.markForCheck();
      }
    };

    update();
    this.chartResizeHandler = update;
    window.addEventListener('resize', update);

    const RO = (window as any).ResizeObserver;
    if (RO) {
      this.chartResizeObserver = new RO(update);
      this.chartResizeObserver.observe(el);
    }
  }

  private detachChartResize(): void {
    if (this.chartResizeObserver) {
      this.chartResizeObserver.disconnect();
      this.chartResizeObserver = undefined;
    }
    if (this.chartResizeHandler) {
      window.removeEventListener('resize', this.chartResizeHandler);
      this.chartResizeHandler = undefined;
    }
  }

  private loadChartIfAvailable(): void {
    const meta = this.meta;
    if (!meta || !meta.species || !meta.gene || !this.epitope.epitope) {
      return;
    }
    const url = MotifEpitopeEntryComponent.resolveMotifChartUrl(meta.species, meta.gene, this.epitope.epitope, this.motifService.getMethod());
    this.isChartLoading = true;
    this.changeDetector.markForCheck();
    Utils.HTTP.head(url).then(() => {
      this.chartUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.isChartLoading = false;
      this.changeDetector.markForCheck();
    }).catch(() => {
      this.chartUrl = null;
      this.isChartLoading = false;
      this.changeDetector.markForCheck();
    });
  }
}

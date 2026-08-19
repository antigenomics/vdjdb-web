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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SearchAvailabilityService } from 'pages/search/table/search/search-availability.service';
import { IStructureCluster, IStructureClusterMeta, IStructureEpitope } from 'pages/structure/structure';
import { StructureService, StructuresServiceEvents } from 'pages/structure/structure.service';
import { StructureHoverController } from 'pages/structure/structure_hover/structure-hover.controller';
import { StructureZoomController } from 'pages/structure/structure_zoom/structure-zoom.controller';
import { Subscription } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { Utils } from 'utils/utils';
import ColorizedPatternRegion = Utils.SequencePattern.ColorizedPatternRegion;

interface IParsedChainLabel {
    cdr3?: string;
    v?: string;
    j?: string;
}

interface IParsedPairLabel {
    alpha?: IParsedChainLabel;
    beta?: IParsedChainLabel;
}

interface IOverlayTableRow {
    cluster: IStructureCluster;
    alphaClusterId?: string;
    betaClusterId?: string;
    cdr3a?: string;
    cdr3b?: string;
    cdr3aRegions: ColorizedPatternRegion[];
    cdr3bRegions: ColorizedPatternRegion[];
    trav?: string;
    traj?: string;
    trbv?: string;
    trbj?: string;
    hasHtml: boolean;
    motifLink?: string;
    motifAvailable?: boolean;
    motifParams?: IMotifParams;
    alphaMotifLink?: string;
    betaMotifLink?: string;
}

interface IMotifParams {
    species: string;
    tcrChain: string;
    mhcClass: string;
    gene: string;
    epitope: string;
}

@Component({
    selector:        'structure-epitope-entry',
    templateUrl:     './structure-epitope-entry.component.html',
    styleUrls:       [ './structure-epitope-entry.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StructureEpitopeEntryComponent implements OnInit, OnDestroy {
    private static readonly overlayViewportBottomPadding: number = 150;
    private static readonly overlayHeaderExtraPadding: number = 51;
    private static readonly overlayMinWidthPx: number = 0;
    private static readonly overlayHeaderMargin: number = 12;
    private static readonly overlayMinHeightPx: number = 0;
    private static readonly overlayFallbackAspectRatio: number = 6 / 5;
    private subscription: Subscription;
    private destroy$ = new Subject<void>();
    private overlaySelection: string[] = [];
    private overlayLayerMap: Map<string, { standard?: SafeHtml, simple?: SafeHtml }> = new Map<string, { standard?: SafeHtml, simple?: SafeHtml }>();
    private overlayResizeObserver?: { observe(target: Element): void; disconnect(): void };
    private overlayElement?: HTMLElement;
    private overlayRecalcRafId?: number;
    private overlayRecalcAttemptsLeft: number = 0;

    public meta: IStructureClusterMeta;
    public isHidden: boolean = false;
    public overlayError: string | undefined;
    public readonly overlayLimit: number = 5;
    public readonly downloadTitle: string = 'Download data';
    public readonly downloadDirectory: string = '/structure-files/structure';
    public overlayLayerList: Array<{ id: string, markup: SafeHtml, mode: 'standard' | 'simple' }> = [];
    public overlayTableRows: IOverlayTableRow[] = [];
    public overlayScrollerMaxHeight?: number;
    public overlayWidth: number = StructureEpitopeEntryComponent.overlayMinWidthPx;
    public overlayHeight: number = StructureEpitopeEntryComponent.overlayMinHeightPx;
    public zoomState: StructureZoomController;
    public hoverState: StructureHoverController;
    @Input('epitope') public epitope: IStructureEpitope;
    @Input('isNormalized') public isNormalized: boolean;
    @Output('onDiscard') public onDiscard = new EventEmitter<IStructureEpitope>();
    @ViewChild('structureOverlay') public set structureOverlayRef(ref: ElementRef<HTMLElement> | undefined) {
        this.attachOverlayObserver(ref);
    }
    @ViewChild('zoomCanvas') public set zoomCanvasRef(ref: ElementRef<HTMLElement> | undefined) {
        this.zoomState.attachCanvas(ref ? ref.nativeElement : undefined);
    }
    @ViewChild('zoomViewport') public set zoomViewportRef(ref: ElementRef<HTMLElement> | undefined) {
        this.zoomState.attachViewport(ref ? ref.nativeElement : undefined);
    }

    constructor(private structureService: StructureService, private availability: SearchAvailabilityService,
                private changeDetector: ChangeDetectorRef, private sanitizer: DomSanitizer) {
        this.zoomState = new StructureZoomController(this.changeDetector);
        this.hoverState = new StructureHoverController(this.changeDetector);
    }

    public ngOnInit(): void {
        this.meta = this.epitope.clusters[0].meta;
        this.subscription = this.structureService.getEvents().pipe(filter((event) => event === StructuresServiceEvents.HIDE_CLUSTERS)).subscribe(() => {
            this.isHidden = true;
            this.changeDetector.markForCheck();
        });
        this.overlayTableRows = this.epitope.clusters.map((cluster) => this.buildOverlayRow(cluster));
        this.loadMotifAvailability();
        // Safe defaults until the overlay container is measured.
        this.setOverlayScrollerMaxHeight(this.overlayHeight);

        // Check for a highlighted tcrHash (navigating from VDJdb table).
        // ReplaySubject replays synchronously, so we can read the current value via take(1).
        let initialTcrHash: string | null = null;
        this.structureService.getHighlightedClusterIdx().pipe(take(1)).subscribe((hash) => {
          initialTcrHash = hash;
        });

        const findClusterByHash = (hash: string) =>
          this.epitope.clusters.find((c) => c.clusterId.toLowerCase() === hash.toLowerCase());

        if (initialTcrHash) {
          const targetCluster = findClusterByHash(initialTcrHash);
          if (targetCluster) {
            this.overlaySelection = [ targetCluster.clusterId ];
            this.overlayLayerMap.clear();
            this.ensureOverlayLayer(targetCluster);
            this.updateOverlayLayerList();
            this.reorderOverlayRows();
            this.changeDetector.markForCheck();
          } else {
            this.initializeOverlaySelection();
          }
        } else {
          this.initializeOverlaySelection();
        }
        this.structureService.setSelectedClusterIds(this.overlaySelection.slice());

        // Also respond to future highlighted hash changes
        this.structureService.getHighlightedClusterIdx().pipe(takeUntil(this.destroy$)).subscribe((hash) => {
          if (hash) {
            const targetCluster = findClusterByHash(hash);
            if (targetCluster && !this.isClusterSelected(targetCluster)) {
              this.overlaySelection = [ targetCluster.clusterId ];
              this.overlayLayerMap.clear();
              this.ensureOverlayLayer(targetCluster);
              this.updateOverlayLayerList();
              this.reorderOverlayRows();
              this.structureService.setSelectedClusterIds(this.overlaySelection.slice());
              this.changeDetector.markForCheck();
            }
          }
        });
    }

    public discard(): void {
        this.onDiscard.emit(this.epitope);
    }

    public hide(): void {
        this.isHidden = !this.isHidden;
        setTimeout(() => {
            this.structureService.fireScrollUpdateEvent();
            // tslint:disable-next-line:no-magic-numbers
        }, 50);
    }

    public trackClusterBy(_: number, item: IStructureCluster): string {
        return item.clusterId;
    }

    public trackRowBy(_: number, row: IOverlayTableRow): string {
        return row.cluster.clusterId;
    }

    public isClusterSelected(cluster: IStructureCluster): boolean {
        return this.overlaySelection.indexOf(cluster.clusterId) !== -1;
    }

    public get overlaySelectionCount(): number {
        return this.overlaySelection.length;
    }

    public get filteredStructuresCount(): number {
        return this.overlayTableRows.length;
    }

    /**
     * Sorts the card list so it reads in the same order as the overlay stacks: selected structures
     * first, front-most at the top, then everything unselected in its original order.
     *
     * A stable sort on a key rather than a comparator over `indexOf`, so cards that share a key -
     * every unselected one - keep the order the epitope gave them and do not shuffle on each
     * selection.
     */
    private reorderOverlayRows(): void {
        const rank = (row: IOverlayTableRow): number => {
            const position = this.overlaySelection.indexOf(row.cluster.clusterId);
            return position === -1 ? this.overlaySelection.length : position;
        };

        this.overlayTableRows = this.overlayTableRows
            .map((row, index) => ({ row, rank: rank(row), index }))
            .sort((left, right) => left.rank - right.rank || left.index - right.index)
            .map((entry) => entry.row);
    }

    /** Whether this cluster is the one drawn at the front of the stack. */
    public isClusterAtFront(cluster: IStructureCluster): boolean {
        return this.overlaySelection.length > 0 && this.overlaySelection[ 0 ] === cluster.clusterId;
    }

    /**
     * Brings a selected structure to the front of the overlay and the top of the list.
     *
     * Front-ness is position zero of `overlaySelection`, and index zero is rendered from the
     * `standard` markup while everything behind it uses `simple` - so this is not a permutation of
     * z-index, it changes which variant two structures are drawn from. `updateOverlayLayerList`
     * already derives both from position, so moving the id is enough and the swap follows.
     *
     * Only selected structures can be promoted: an unselected card has nothing in the overlay to
     * bring forward, and its button is not rendered.
     */
    public onBringToFront(row: IOverlayTableRow, event?: MouseEvent): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!row || !row.cluster) {
            return;
        }

        const position = this.overlaySelection.indexOf(row.cluster.clusterId);
        if (position <= 0) {
            return; // not selected, or already at the front
        }

        this.overlaySelection.splice(position, 1);
        this.overlaySelection.unshift(row.cluster.clusterId);

        this.updateOverlayLayerList();
        this.reorderOverlayRows();
        this.structureService.setSelectedClusterIds(this.overlaySelection.slice());
        this.changeDetector.markForCheck();
    }

    public onRowToggle(row: IOverlayTableRow, event?: MouseEvent): void {
        if (!row) {
            return;
        }
        if (this.shouldSkipToggle(event)) {
            return;
        }
        this.onOverlaySelectionChange(row.cluster, !this.isClusterSelected(row.cluster));
    }

    public onOverlaySelectionChange(cluster: IStructureCluster, checked: boolean): void {
        if (!cluster || !cluster.clusterId) {
            return;
        }
        if (checked) {
            if (this.isClusterSelected(cluster)) {
                return;
            }
            if (this.overlaySelection.length >= this.overlayLimit) {
                this.overlayError = `You can select no more than ${this.overlayLimit} structures.`;
                this.changeDetector.markForCheck();
                return;
            }
            if (!cluster.visualization || cluster.visualization.kind !== 'html') {
                this.overlayError = 'This structure does not have an HTML visualization.';
                this.changeDetector.markForCheck();
                return;
            }
            this.overlaySelection.push(cluster.clusterId);
            this.overlayError = undefined;
            this.ensureOverlayLayer(cluster);
            this.structureService.setSelectedClusterIds(this.overlaySelection.slice());
        } else {
            const index = this.overlaySelection.indexOf(cluster.clusterId);
            if (index !== -1) {
                this.overlaySelection.splice(index, 1);
                this.overlayLayerMap.delete(cluster.clusterId);
                this.structureService.releaseHtmlVisualizationMarkup(cluster);
                this.updateOverlayLayerList();
                this.reorderOverlayRows();
                this.overlayError = undefined;
                this.structureService.setSelectedClusterIds(this.overlaySelection.slice());
                this.changeDetector.markForCheck();
            }
        }
    }

    public isRowDisabled(row: IOverlayTableRow): boolean {
        if (!row || !row.cluster) {
            return true;
        }
        if (!row.hasHtml) {
            return !this.isClusterSelected(row.cluster);
        }
        return !this.isClusterSelected(row.cluster) && this.overlaySelection.length >= this.overlayLimit;
    }


    public onDownloadClick(row: IOverlayTableRow, event: MouseEvent): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (!row || !row.cluster) {
            return;
        }
        const hash = this.resolveStructureHash(row.cluster);
        if (!hash) {
            return;
        }
        const epitope = this.epitope && this.epitope.epitope ? this.epitope.epitope.trim() : '';
        const fileName = `${epitope}_${hash.slice(0, 6)}.zip`;
        const fileUrl = `${this.downloadDirectory}/${encodeURIComponent(fileName)}`;
        this.startDownload(fileUrl, fileName);
    }

    public onShowTableClick(event?: MouseEvent): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        const epitopeSeq = this.epitope && this.epitope.epitope ? this.epitope.epitope.trim() : '';
        if (!epitopeSeq) {
            return;
        }
        const params = new URLSearchParams();
        params.set('epitope_seq', epitopeSeq);
        params.set('struct', 'native,contacts,quality');
        window.open(`/search?${params.toString()}`, '_blank');
    }

    @HostListener('window:resize')
    public onWindowResize(): void {
        this.recalculateOverlaySize();
    }

    private async ensureOverlayLayer(cluster: IStructureCluster): Promise<void> {
        if (!cluster || !cluster.clusterId || !cluster.visualization || cluster.visualization.kind !== 'html') {
            return;
        }
        const existing = this.overlayLayerMap.get(cluster.clusterId) || {};
        let standardMarkup = existing.standard;
        let simpleMarkup = existing.simple;

        if (!standardMarkup) {
            const markup = await this.structureService.getHtmlVisualizationMarkup(cluster, 'standard');
            if (markup) {
                standardMarkup = this.sanitizer.bypassSecurityTrustHtml(markup);
            }
        }

        if (!standardMarkup) {
            const index = this.overlaySelection.indexOf(cluster.clusterId);
            if (index !== -1) {
                this.overlaySelection.splice(index, 1);
            }
            this.overlayError = `Failed to load structure ${cluster.clusterId}.`;
            this.updateOverlayLayerList();
            this.reorderOverlayRows();
            this.changeDetector.markForCheck();
            return;
        }

        if (!simpleMarkup) {
            const markupSimple = await this.structureService.getHtmlVisualizationMarkup(cluster, 'simple');
            if (markupSimple) {
                simpleMarkup = this.sanitizer.bypassSecurityTrustHtml(markupSimple);
            }
        }

        this.overlayLayerMap.set(cluster.clusterId, {
            standard: standardMarkup,
            simple: simpleMarkup || existing.simple
        });
        this.overlayError = undefined;
        this.updateOverlayLayerList();
        this.reorderOverlayRows();
        this.changeDetector.markForCheck();
    }

    private updateOverlayLayerList(): void {
        const wasEmpty = this.overlayLayerList.length === 0;
        this.overlayLayerList = this.overlaySelection
            .map((id, index) => {
                const entry = this.overlayLayerMap.get(id);
                if (!entry || !entry.standard) {
                    return undefined;
                }
                const mode: 'standard' | 'simple' = index === 0 ? 'standard' : 'simple';
                const markup = mode === 'simple' ? (entry.simple || entry.standard) : entry.standard;
                return markup ? { id, markup, mode } : undefined;
            })
            .filter((entry): entry is { id: string, markup: SafeHtml, mode: 'standard' | 'simple' } => entry !== undefined);

        // When overlay appears after being empty, we may measure before layout settles.
        // Retry size calculation on the next frame(s) to avoid "huge" first render.
        if (wasEmpty && this.overlayLayerList.length > 0) {
            this.scheduleOverlayRecalc();
        }
    }

    private initializeOverlaySelection(): void {
        this.overlayError = undefined;
        this.overlaySelection = [];
        this.overlayLayerMap.clear();
        this.overlayLayerList = [];

        const htmlCapable = this.overlayTableRows.filter((row) => row.hasHtml);
        if (htmlCapable.length === 0) {
            this.overlayError = 'No structures with HTML visualization are available for overlay.';
            this.changeDetector.markForCheck();
            return;
        }

        htmlCapable.slice(0, this.overlayLimit).forEach((row) => {
            if (row.cluster && row.cluster.clusterId) {
                this.overlaySelection.push(row.cluster.clusterId);
                this.ensureOverlayLayer(row.cluster);
            }
        });
        this.updateOverlayLayerList();
        this.reorderOverlayRows();
        this.changeDetector.markForCheck();
    }

    private buildOverlayRow(cluster: IStructureCluster): IOverlayTableRow {
        const pairLabel = this.parsePairLabel(cluster.tcrPairLabel);
        const clusterIds = this.parseClusterIds(cluster);
        const alpha = pairLabel.alpha || {};
        const beta = pairLabel.beta || {};
        const cdr3a = typeof alpha.cdr3 === 'string' ? alpha.cdr3 : '';
        const cdr3b = typeof beta.cdr3 === 'string' ? beta.cdr3 : '';
        const meta = cluster.meta || {} as IStructureClusterMeta;
        const motifParams = this.buildMotifParams(meta, this.epitope.epitope);
        const motifLink = motifParams ? this.buildMotifLink(motifParams) : undefined;
        const chainCids = this.parseChainCids(cluster);

        return {
            cluster,
            alphaClusterId: clusterIds.alpha,
            betaClusterId: clusterIds.beta,
            alphaMotifLink: chainCids.alpha ? this.buildChainMotifLink(meta, this.epitope.epitope, 'TRA', chainCids.alpha) : undefined,
            betaMotifLink: chainCids.beta ? this.buildChainMotifLink(meta, this.epitope.epitope, 'TRB', chainCids.beta) : undefined,
            cdr3a,
            cdr3b,
            cdr3aRegions: this.buildColorizedCdr3(cdr3a, cluster.cdr3aVEnd, cluster.cdr3aJStart),
            cdr3bRegions: this.buildColorizedCdr3(cdr3b, cluster.cdr3bVEnd, cluster.cdr3bJStart),
            trav: typeof alpha.v === 'string' ? alpha.v : '',
            traj: typeof alpha.j === 'string' ? alpha.j : '',
            trbv: typeof beta.v === 'string' ? beta.v : '',
            trbj: typeof beta.j === 'string' ? beta.j : '',
            hasHtml: !!(cluster.visualization && cluster.visualization.kind === 'html'),
            motifParams,
            motifLink
        };
    }

    private buildColorizedCdr3(cdr3: string, vEnd?: number, jStart?: number): ColorizedPatternRegion[] {
        if (!cdr3) {
            return [];
        }
        const safeVEnd = typeof vEnd === 'number' ? vEnd : -1;
        const safeJStart = typeof jStart === 'number' ? jStart : -1;
        return Utils.SequencePattern.colorizePattern(cdr3, safeVEnd, safeJStart)
            .filter((region) => !!region && typeof region.part === 'string' && region.part.length > 0);
    }

    private buildMotifParams(meta: IStructureClusterMeta, epitope: string): IMotifParams | undefined {
        if (!meta || !epitope) {
            return undefined;
        }
        const species = meta.species || '';
        const tcrChain = meta.gene || '';
        const mhcClass = meta.mhcclass || '';
        const gene = this.normalizeMhcGene(meta.mhca || '');
        if (!species || !tcrChain || !mhcClass || !gene) {
            return undefined;
        }
        return {
            species,
            tcrChain,
            mhcClass,
            gene,
            epitope
        };
    }

    private buildMotifLink(params: IMotifParams): string {
        const search = new URLSearchParams();
        search.set('species', params.species);
        search.set('tcr_chain', params.tcrChain);
        search.set('mhc_class', params.mhcClass);
        search.set('gene', params.gene);
        search.set('epitope_seq', params.epitope);
        return `/motif?${search.toString()}`;
    }

    private normalizeMhcGene(value: string): string {
        return value ? value.replace(/:.+/, '').trim() : '';
    }

    // Full motif cluster id per chain (e.g. "H.A.RPIIRPATL.2" / "H.B.RPIIRPATL.1"), parsed from the
    // cluster's displayId. Only chains whose id unambiguously identifies alpha/beta get a link.
    private parseChainCids(cluster: IStructureCluster): { alpha?: string; beta?: string } {
        const result: { alpha?: string; beta?: string } = {};
        this.splitDisplayIds(cluster.displayId).forEach((id) => {
            const chain = this.detectChainFromId(id);
            if (chain === 'alpha' && !result.alpha) {
                result.alpha = id;
            } else if (chain === 'beta' && !result.beta) {
                result.beta = id;
            }
        });
        return result;
    }

    private buildChainMotifLink(meta: IStructureClusterMeta, epitope: string, chain: 'TRA' | 'TRB', cid: string): string | undefined {
        const species = meta && meta.species ? meta.species : '';
        const mhcClass = meta && meta.mhcclass ? meta.mhcclass : '';
        const gene = this.normalizeMhcGene(meta && meta.mhca ? meta.mhca : '');
        if (!species || !mhcClass || !gene || !epitope || !cid) {
            return undefined;
        }
        const search = new URLSearchParams();
        search.set('species', species);
        search.set('tcr_chain', chain);
        search.set('mhc_class', mhcClass);
        search.set('mhc_a', gene);
        search.set('epitope_seq', epitope);
        search.set('cid', cid);
        return `/motif?${search.toString()}`;
    }

    private loadMotifAvailability(): void {
        const rows = this.overlayTableRows.filter((row) => !!row.motifParams);
        if (rows.length === 0) {
            return;
        }
        rows.forEach((row) => {
            if (!row.motifParams) {
                return;
            }
            const params = row.motifParams;
            this.availability.hasMotif(params.species, params.tcrChain, params.mhcClass, params.gene, params.epitope)
                .then((available) => {
                    row.motifAvailable = available;
                    this.changeDetector.markForCheck();
                })
                .catch(() => {
                    row.motifAvailable = false;
                    this.changeDetector.markForCheck();
                });
        });
    }

    private parsePairLabel(label?: string): IParsedPairLabel {
        if (!label || typeof label !== 'string') {
            return {};
        }
        const parts = label.split(';').map((part) => part.trim()).filter((part) => part.length > 0);
        const result: IParsedPairLabel = {};
        for (const part of parts) {
            const chain = this.parseChainLabel(part);
            const upper = part.toUpperCase();
            if (upper.startsWith('TRA') && !result.alpha) {
                result.alpha = chain;
            } else if (upper.startsWith('TRB') && !result.beta) {
                result.beta = chain;
            } else if (!result.alpha) {
                result.alpha = chain;
            } else if (!result.beta) {
                result.beta = chain;
            }
        }
        return result;
    }

    private parseChainLabel(label: string): IParsedChainLabel {
        const trimmed = (label || '').trim();
        if (!trimmed) {
            return {};
        }
        const match = trimmed.match(/^(.*?)-([A-Z]+)-(.+)$/);
        if (match) {
            return {
                v: match[1],
                cdr3: match[2],
                j: match[3]
            };
        }
        const segments = trimmed.split('-').filter((segment) => segment.length > 0);
        if (segments.length >= 3) {
            return {
                v: segments[0],
                cdr3: segments[1],
                j: segments.slice(2).join('-')
            };
        }
        if (segments.length === 2) {
            return {
                v: segments[0],
                j: segments[1]
            };
        }
        return { v: trimmed };
    }

    private parseClusterIds(cluster: IStructureCluster): { alpha?: string; beta?: string } {
        const rawIds = this.splitDisplayIds(cluster.displayId || cluster.clusterId);
        const result: { alpha?: string; beta?: string } = {};

        rawIds.forEach((id) => {
            const chain = this.detectChainFromId(id);
            const number = this.extractClusterNumber(id);
            if (!number) {
                return;
            }
            if (chain === 'alpha' && !result.alpha) {
                result.alpha = number;
                return;
            }
            if (chain === 'beta' && !result.beta) {
                result.beta = number;
                return;
            }
            if (!result.alpha) {
                result.alpha = number;
            } else if (!result.beta) {
                result.beta = number;
            }
        });

        if (!result.alpha && !result.beta) {
            const fallback = this.extractClusterNumber(cluster.clusterId);
            if (fallback) {
                result.alpha = fallback;
            }
        }

        return result;
    }

    private splitDisplayIds(id?: string): string[] {
        if (!id || typeof id !== 'string') {
            return [];
        }
        return id.split(/[\\/;]+/).map((part) => part.trim()).filter((part) => part.length > 0);
    }

    private detectChainFromId(id: string): 'alpha' | 'beta' | undefined {
        const normalized = id.toUpperCase();
        if (normalized.includes('.A.') || normalized.includes(' A ')) {
            return 'alpha';
        }
        if (normalized.includes('.B.') || normalized.includes(' B ')) {
            return 'beta';
        }
        const tokens = normalized.split('.').map((token) => token.trim()).filter((token) => token.length > 0);
        if (tokens.some((token) => token === 'A' || token === 'ALPHA' || token === 'TRA')) {
            return 'alpha';
        }
        if (tokens.some((token) => token === 'B' || token === 'BETA' || token === 'TRB')) {
            return 'beta';
        }
        return undefined;
    }

    private extractClusterNumber(id?: string): string | undefined {
        if (!id || typeof id !== 'string') {
            return undefined;
        }
        const parts = id.split('.').map((part) => part.trim()).filter((part) => part.length > 0);
        const numeric = parts.reverse().find((part) => /^[0-9]+$/.test(part));
        return numeric;
    }

    public ngOnDestroy(): void {
        this.hoverState.detach();
        this.disconnectOverlayObserver();
        this.cancelOverlayRecalc();
        this.overlaySelection.forEach((id) => this.structureService.releaseHtmlVisualizationMarkup(id));
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        this.destroy$.next();
        this.destroy$.complete();
        this.zoomState.destroy();
    }

    private attachOverlayObserver(ref: ElementRef<HTMLElement> | undefined): void {
        this.disconnectOverlayObserver();
        this.overlayElement = undefined;
        if (!ref || !ref.nativeElement) {
            if (this.overlayScrollerMaxHeight !== undefined) {
                this.overlayScrollerMaxHeight = undefined;
            }
            this.changeDetector.markForCheck();
            return;
        }

        const element = ref.nativeElement;
        this.overlayElement = element;
        this.recalculateOverlaySize();
        this.scheduleOverlayRecalc();
        const ResizeObserverCtor = (window as any).ResizeObserver as (new (callback: (entries: Array<{ contentRect: { height: number } }>) => void)
            => { observe(target: Element): void; disconnect(): void });
        if (!ResizeObserverCtor) {
            this.setOverlayScrollerMaxHeight(element.getBoundingClientRect().height);
            this.recalculateOverlaySize();
            this.scheduleOverlayRecalc();
            return;
        }

        this.overlayResizeObserver = new ResizeObserverCtor((entries: Array<{ contentRect: { height: number } }>) => {
            if (!entries || entries.length === 0) {
                return;
            }
            const entry = entries[entries.length - 1];
            this.setOverlayScrollerMaxHeight(entry.contentRect.height);
            this.recalculateOverlaySize();
        });
        this.overlayResizeObserver.observe(element);
        this.setOverlayScrollerMaxHeight(element.getBoundingClientRect().height);
        this.recalculateOverlaySize();
        this.scheduleOverlayRecalc();
    }

    private disconnectOverlayObserver(): void {
        if (this.overlayResizeObserver) {
            this.overlayResizeObserver.disconnect();
            this.overlayResizeObserver = undefined;
        }
    }

    private setOverlayScrollerMaxHeight(height: number): void {
        const nextHeight = Math.max(0, Math.round(height));
        if (this.overlayScrollerMaxHeight === nextHeight) {
            return;
        }
        this.overlayScrollerMaxHeight = nextHeight;
        this.changeDetector.markForCheck();
    }

    private recalculateOverlaySize(): void {
        if (!this.overlayElement) {
            return;
        }

        const viewportHeight = Math.max(window.innerHeight || 0, document.documentElement ? document.documentElement.clientHeight : 0);
        if (viewportHeight <= 0) {
            return;
        }

        const parentElement = this.overlayElement.parentElement as HTMLElement | null;
        const parentWidth = parentElement ? Math.round(parentElement.getBoundingClientRect().width) : Math.round(this.overlayElement.getBoundingClientRect().width);
        if (parentWidth <= 0) {
            // Fallback: at least cap by viewport to avoid the initial "huge" render.
            this.recalculateOverlaySizeFallback();
            return;
        }

        const topMenu = document.querySelector('.ui.top.fixed.borderless.inverted.menu.large') as HTMLElement | null;
        const headerHeight = topMenu ? Math.max(0, Math.round(topMenu.getBoundingClientRect().height)) : 0;
        const availableHeight = Math.max(
            0,
            viewportHeight
            - headerHeight
            - StructureEpitopeEntryComponent.overlayHeaderExtraPadding
            - StructureEpitopeEntryComponent.overlayHeaderMargin
            - StructureEpitopeEntryComponent.overlayViewportBottomPadding
        );
        if (availableHeight <= 0) {
            return;
        }

        const aspectRatio = StructureEpitopeEntryComponent.overlayFallbackAspectRatio;
        const minWidthByHeight = Math.round(StructureEpitopeEntryComponent.overlayMinHeightPx * aspectRatio);
        const minWidth = Math.max(StructureEpitopeEntryComponent.overlayMinWidthPx, minWidthByHeight);

        const widthByHeightLimit = Math.round(availableHeight * aspectRatio);
        const boundedWidth = Math.min(parentWidth, widthByHeightLimit);
        const nextWidth = Math.max(minWidth, boundedWidth);
        const nextHeight = Math.round(nextWidth / aspectRatio);

        const hasSizeChanged = this.overlayWidth !== nextWidth || this.overlayHeight !== nextHeight;
        this.overlayWidth = nextWidth;
        this.overlayHeight = nextHeight;
        this.setOverlayScrollerMaxHeight(nextHeight);

        if (hasSizeChanged) {
            this.changeDetector.markForCheck();
        }
    }

    private scheduleOverlayRecalc(): void {
        if (!this.overlayElement) {
            return;
        }
        // Try a few times to allow DOM + innerHTML SVG to mount and settle.
        if (this.overlayRecalcAttemptsLeft <= 0) {
            this.overlayRecalcAttemptsLeft = 3;
        }
        if (this.overlayRecalcRafId !== undefined) {
            return;
        }
        this.overlayRecalcRafId = window.requestAnimationFrame(() => {
            this.overlayRecalcRafId = undefined;
            this.overlayRecalcAttemptsLeft = Math.max(0, this.overlayRecalcAttemptsLeft - 1);
            this.recalculateOverlaySize();

            if ((this.overlayWidth === undefined || this.overlayHeight === undefined) && this.overlayRecalcAttemptsLeft > 0) {
                this.scheduleOverlayRecalc();
            }
        });
    }

    private cancelOverlayRecalc(): void {
        if (this.overlayRecalcRafId !== undefined) {
            window.cancelAnimationFrame(this.overlayRecalcRafId);
            this.overlayRecalcRafId = undefined;
        }
        this.overlayRecalcAttemptsLeft = 0;
    }

    private recalculateOverlaySizeFallback(): void {
        const viewportHeight = Math.max(window.innerHeight || 0, document.documentElement ? document.documentElement.clientHeight : 0);
        if (viewportHeight <= 0) {
            return;
        }

        const topMenu = document.querySelector('.ui.top.fixed.borderless.inverted.menu.large') as HTMLElement | null;
        const headerHeight = topMenu ? Math.max(0, Math.round(topMenu.getBoundingClientRect().height)) : 0;
        const availableHeight = Math.max(
            0,
            viewportHeight
            - headerHeight
            - StructureEpitopeEntryComponent.overlayHeaderExtraPadding
            - StructureEpitopeEntryComponent.overlayHeaderMargin
            - StructureEpitopeEntryComponent.overlayViewportBottomPadding
        );
        if (availableHeight <= 0) {
            return;
        }

        const aspectRatio = StructureEpitopeEntryComponent.overlayFallbackAspectRatio;
        const minWidthByHeight = Math.round(StructureEpitopeEntryComponent.overlayMinHeightPx * aspectRatio);
        const minWidth = Math.max(StructureEpitopeEntryComponent.overlayMinWidthPx, minWidthByHeight);

        const widthByHeightLimit = Math.round(availableHeight * aspectRatio);
        const nextWidth = Math.max(minWidth, widthByHeightLimit);
        const nextHeight = Math.round(nextWidth / aspectRatio);

        const hasSizeChanged = this.overlayWidth !== nextWidth || this.overlayHeight !== nextHeight;
        this.overlayWidth = nextWidth;
        this.overlayHeight = nextHeight;
        this.setOverlayScrollerMaxHeight(nextHeight);

        if (hasSizeChanged) {
            this.changeDetector.markForCheck();
        }
    }

    private shouldSkipToggle(event?: MouseEvent): boolean {
        if (!event) {
            return false;
        }
        const selection = window.getSelection();
        if (!selection) {
            return false;
        }
        return selection.toString().trim().length > 0;
    }

    private resolveStructureHash(cluster: IStructureCluster): string {
        if (!cluster || typeof cluster.clusterId !== 'string') {
            return '';
        }
        return cluster.clusterId.trim();
    }

    private startDownload(url: string, fileName: string): void {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

}

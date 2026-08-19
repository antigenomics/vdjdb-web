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
import { IOverlayTableRow, StructureOverlayRow } from 'pages/structure/structure_overlay_row/structure-overlay-row';
import { StructureService, StructuresServiceEvents } from 'pages/structure/structure.service';
import { StructureHoverController } from 'pages/structure/structure_hover/structure-hover.controller';
import { StructureOverlaySizeController } from 'pages/structure/structure_overlay_size/structure-overlay-size.controller';
import { StructureZoomController } from 'pages/structure/structure_zoom/structure-zoom.controller';
import { Subscription } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
    selector:        'structure-epitope-entry',
    templateUrl:     './structure-epitope-entry.component.html',
    styleUrls:       [ './structure-epitope-entry.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StructureEpitopeEntryComponent implements OnInit, OnDestroy {
    private subscription: Subscription;
    private destroy$ = new Subject<void>();
    private overlaySelection: string[] = [];
    private overlayLayerMap: Map<string, { standard?: SafeHtml, simple?: SafeHtml }> = new Map<string, { standard?: SafeHtml, simple?: SafeHtml }>();

    public meta: IStructureClusterMeta;
    public isHidden: boolean = false;
    public overlayError: string | undefined;
    public readonly overlayLimit: number = 5;
    public readonly downloadTitle: string = 'Download data';
    public readonly downloadDirectory: string = '/structure-files/structure';
    public overlayLayerList: Array<{ id: string, markup: SafeHtml, mode: 'standard' | 'simple' }> = [];
    public overlayTableRows: IOverlayTableRow[] = [];
    public sizeState: StructureOverlaySizeController;
    public zoomState: StructureZoomController;
    public hoverState: StructureHoverController;
    @Input('epitope') public epitope: IStructureEpitope;
    @Input('isNormalized') public isNormalized: boolean;
    @Output('onDiscard') public onDiscard = new EventEmitter<IStructureEpitope>();
    @ViewChild('structureOverlay') public set structureOverlayRef(ref: ElementRef<HTMLElement> | undefined) {
        this.sizeState.attach(ref ? ref.nativeElement : undefined);
    }
    @ViewChild('zoomCanvas') public set zoomCanvasRef(ref: ElementRef<HTMLElement> | undefined) {
        this.zoomState.attachCanvas(ref ? ref.nativeElement : undefined);
    }
    @ViewChild('zoomViewport') public set zoomViewportRef(ref: ElementRef<HTMLElement> | undefined) {
        this.zoomState.attachViewport(ref ? ref.nativeElement : undefined);
    }

    constructor(private structureService: StructureService, private availability: SearchAvailabilityService,
                private changeDetector: ChangeDetectorRef, private sanitizer: DomSanitizer) {
        this.sizeState = new StructureOverlaySizeController(this.changeDetector);
        this.zoomState = new StructureZoomController(this.changeDetector);
        this.hoverState = new StructureHoverController();
    }

    public ngOnInit(): void {
        this.meta = this.epitope.clusters[0].meta;
        this.subscription = this.structureService.getEvents().pipe(filter((event) => event === StructuresServiceEvents.HIDE_CLUSTERS)).subscribe(() => {
            this.isHidden = true;
            this.changeDetector.markForCheck();
        });
        this.overlayTableRows = this.epitope.clusters.map((cluster) => StructureOverlayRow.build(cluster, this.epitope.epitope));
        this.loadMotifAvailability();
        // Safe defaults until the overlay container is measured.

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
        this.sizeState.recalculate();
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
            this.sizeState.recalculate();
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

    public ngOnDestroy(): void {
        this.sizeState.detach();
        this.overlaySelection.forEach((id) => this.structureService.releaseHtmlVisualizationMarkup(id));
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
        this.destroy$.next();
        this.destroy$.complete();
        this.zoomState.destroy();
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

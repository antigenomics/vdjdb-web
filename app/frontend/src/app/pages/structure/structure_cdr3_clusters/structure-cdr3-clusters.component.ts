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

import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, HostListener, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';
import {
    IStructureCDR3SearchEntry,
    IStructureCDR3SearchResult,
    IStructureEpitopeViewOptions
} from 'pages/structure/structure';
import { StructurePageChrome } from 'pages/structure/structure_overlay_size/structure-overlay-size.controller';

/** How many results a page of the list holds. */
const PAGE_SIZE = 10;

/** How many page numbers to show either side of the current one. */
const PAGE_NUMBER_RANGE = 3;

/** Contact maps are drawn 6:5. */
const ASPECT_RATIO = 6 / 5;

/** Padding the page keeps around the list, above and below what the chrome already takes. Same
 *  names and the same 51 as the overlay's own sizing, so the two read alike. */
const HEADER_EXTRA_PADDING = 51;
const VIEWPORT_BOTTOM_PADDING = 35;

/**
 * Bounds on the map, independent of the viewport: 960 is the page's content width less the 180 the
 * result's own header occupies, and below 560 a contact map stops being readable, so a short window
 * scrolls rather than shrinking the plot further.
 */
const MAX_WIDTH_PX = 960 - 180;
const MIN_WIDTH_PX = 560;

@Component({
    selector:        'structure-cdr3-clusters',
    templateUrl:     './structure-cdr3-clusters.component.html',
    styleUrls:       [ './structure-cdr3-clusters.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StructureCDR3ClustersComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {

    @Input('options')
    public options: IStructureEpitopeViewOptions;
    @Input('clusters')
    public clusters: IStructureCDR3SearchResult;

    /** What each map is sized to. Undefined until the page has been measured. */
    public maxWidthPx?: number;
    public maxHeightPx?: number;
    public currentPage: number = 0;

    private resizeObserver?: { observe(target: Element): void; disconnect(): void };
    private frameId?: number;

    constructor(private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this.scheduleMeasure();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.clusters) {
            this.currentPage = 0;
        }
    }

    public ngAfterViewInit(): void {
        this.observePageChrome();
        this.scheduleMeasure();
    }

    public ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = undefined;
        }
        if (this.frameId !== undefined) {
            window.cancelAnimationFrame(this.frameId);
            this.frameId = undefined;
        }
    }

    @HostListener('window:resize')
    public onWindowResize(): void {
        this.scheduleMeasure();
    }

    /** Every hit, ranked the way the reader asked for. */
    public allEntries(): IStructureCDR3SearchEntry[] {
        return (this.options && this.options.isNormalized) ? this.clusters.clustersNorm : this.clusters.clusters;
    }

    /** The page of them currently on screen. */
    public pageEntries(): IStructureCDR3SearchEntry[] {
        const start = this.currentPage * PAGE_SIZE;
        return this.allEntries().slice(start, start + PAGE_SIZE);
    }

    public pageCount(): number {
        return Math.max(1, Math.ceil(this.allEntries().length / PAGE_SIZE));
    }

    /**
     * The page numbers to offer, as a window around the current one.
     *
     * The window keeps its width at both ends rather than truncating: near page 1 it extends to the
     * right, near the last page to the left, so the control does not change size as it is used.
     */
    public pageNumbers(): number[] {
        const count = this.pageCount();
        let first = this.currentPage - PAGE_NUMBER_RANGE;
        let last = this.currentPage + PAGE_NUMBER_RANGE;
        if (first < 0) {
            last = Math.min(count - 1, last - first);
            first = 0;
        }
        if (last > count - 1) {
            first = Math.max(0, first - (last - (count - 1)));
            last = count - 1;
        }
        const pages: number[] = [];
        for (let page = first; page <= last; page++) {
            pages.push(page + 1);
        }
        return pages;
    }

    public selectPage(page: number): void {
        if (page >= 0 && page < this.pageCount() && this.currentPage !== page) {
            this.currentPage = page;
            this.changeDetector.markForCheck();
        }
    }

    /** The part of the CDR3 that matched, for the map to pick out. */
    public matchedPattern(entry: IStructureCDR3SearchEntry): string {
        return entry ? entry.cdr3 : undefined;
    }

    /** Re-measure whenever anything above the list changes height. */
    private observePageChrome(): void {
        const ResizeObserverCtor = (window as any).ResizeObserver as (new (callback: () => void)
            => { observe(target: Element): void; disconnect(): void });
        if (!ResizeObserverCtor) {
            return;
        }
        this.resizeObserver = new ResizeObserverCtor(() => this.scheduleMeasure());
        [ StructurePageChrome.Navbar, StructurePageChrome.Title, StructurePageChrome.ContextHeader ]
            .map((selector) => StructurePageChrome.find(selector))
            .forEach((node) => {
                if (node && this.resizeObserver) {
                    this.resizeObserver.observe(node);
                }
            });
    }

    private scheduleMeasure(): void {
        if (this.frameId !== undefined) {
            return;
        }
        this.frameId = window.requestAnimationFrame(() => {
            this.frameId = undefined;
            this.measure();
        });
    }

    /** Fit a 6:5 map into whatever the viewport leaves under the page chrome. */
    private measure(): void {
        const viewportHeight = StructurePageChrome.viewportHeight();
        if (viewportHeight <= 0) {
            this.applySize(undefined, undefined);
            return;
        }

        const availableHeight = viewportHeight
            - StructurePageChrome.heightOf(StructurePageChrome.Navbar)
            - StructurePageChrome.heightOf(StructurePageChrome.Title)
            - StructurePageChrome.heightOf(StructurePageChrome.ContextHeader)
            - HEADER_EXTRA_PADDING
            - VIEWPORT_BOTTOM_PADDING;

        if (availableHeight <= 0) {
            this.applySize(undefined, undefined);
            return;
        }

        const width = Math.max(MIN_WIDTH_PX, Math.min(MAX_WIDTH_PX, Math.round(availableHeight * ASPECT_RATIO)));
        this.applySize(width, Math.round(width / ASPECT_RATIO));
    }

    private applySize(width?: number, height?: number): void {
        if (this.maxWidthPx === width && this.maxHeightPx === height) {
            return;
        }
        this.maxWidthPx = width;
        this.maxHeightPx = height;
        this.changeDetector.markForCheck();
    }
}

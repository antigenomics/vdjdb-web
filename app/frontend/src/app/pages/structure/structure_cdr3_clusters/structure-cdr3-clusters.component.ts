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

@Component({
    selector:        'structure-cdr3-clusters',
    templateUrl:     './structure-cdr3-clusters.component.html',
    styleUrls:       [ './structure-cdr3-clusters.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StructureCDR3ClustersComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
    private static readonly cdr3ModeHeaderExtraPadding: number = 51;
    private static readonly cdr3ModeViewportBottomPadding: number = 35;
    private static readonly cdr3ModeAspectRatio: number = 6 / 5;
    private static readonly cdr3ModeMaxWidthPx: number = 960 - 180;
    private static readonly cdr3ModeMinWidthPx: number = 560;

    private static readonly pageSize: number = 10;

    private isHitboxVisible: boolean = true;
    private resizeObserver?: { observe(target: Element): void; disconnect(): void };
    private recalcRafId?: number;
    @Input('options')
    public options: IStructureEpitopeViewOptions;
    @Input('clusters')
    public clusters: IStructureCDR3SearchResult;
    public cdr3MaxWidthPx?: number;
    public cdr3MaxHeightPx?: number;
    public currentPage: number = 0;

    constructor(private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this.scheduleCdr3SizeRecalc();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['clusters']) {
            this.currentPage = 0;
        }
    }

    public ngAfterViewInit(): void {
        this.attachResizeObservers();
        this.scheduleCdr3SizeRecalc();
    }

    public ngOnDestroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = undefined;
        }
        if (this.recalcRafId !== undefined) {
            window.cancelAnimationFrame(this.recalcRafId);
            this.recalcRafId = undefined;
        }
    }

    @HostListener('window:resize')
    public onWindowResize(): void {
        this.scheduleCdr3SizeRecalc();
    }

    public getAllEntries(): IStructureCDR3SearchEntry[] {
        return (this.options && this.options.isNormalized) ? this.clusters.clustersNorm : this.clusters.clusters;
    }

    public getClustersEntries(): IStructureCDR3SearchEntry[] {
        const start = this.currentPage * StructureCDR3ClustersComponent.pageSize;
        return this.getAllEntries().slice(start, start + StructureCDR3ClustersComponent.pageSize);
    }

    public getPageCount(): number {
        return Math.max(1, Math.ceil(this.getAllEntries().length / StructureCDR3ClustersComponent.pageSize));
    }

    public getPageNumbers(): number[] {
        const range = 3;
        const count = this.getPageCount();
        let min = this.currentPage - range;
        let max = this.currentPage + range;
        if (min < 0) { max = Math.min(count - 1, max - min); min = 0; }
        if (max > count - 1) { min = Math.max(0, min - (max - (count - 1))); max = count - 1; }
        const pages: number[] = [];
        for (let i = min; i <= max; i++) { pages.push(i + 1); }
        return pages;
    }

    public selectPage(page: number): void {
        if (page >= 0 && page < this.getPageCount() && this.currentPage !== page) {
            this.currentPage = page;
            this.changeDetector.markForCheck();
        }
    }

    public getCDR3Hitbox(entry: IStructureCDR3SearchEntry): string {
        return this.isHitboxVisible ? entry.cdr3 : undefined;
    }

    public getPatternHelpContent(entry: IStructureCDR3SearchEntry): string {
        if (!entry || !entry.cdr3) {
            return '';
        }
        return `Pattern: ${entry.cdr3.replace(/X/g, 'x')}`;
    }

    public getChainHelpContent(entry: IStructureCDR3SearchEntry): string {
        if (!entry || !entry.chain) {
            return '';
        }
        return `Chain: ${entry.chain}`;
    }

    public toggleHitboxVisibility(): void {
        this.isHitboxVisible = !this.isHitboxVisible;
    }

    private attachResizeObservers(): void {
        const ResizeObserverCtor = (window as any).ResizeObserver as (new (callback: () => void)
            => { observe(target: Element): void; disconnect(): void });
        if (!ResizeObserverCtor) {
            return;
        }
        this.resizeObserver = new ResizeObserverCtor(() => {
            this.scheduleCdr3SizeRecalc();
        });
        const topMenu = document.querySelector('.ui.top.fixed.borderless.inverted.menu.large');
        const title = document.querySelector('h3.ui.top.attached.header');
        const contextHeader = document.querySelector('structure-context-header');
        const nodes = [ topMenu, title, contextHeader ];
        for (const node of nodes) {
            if (node && this.resizeObserver) {
                this.resizeObserver.observe(node);
            }
        }
    }

    private scheduleCdr3SizeRecalc(): void {
        if (this.recalcRafId !== undefined) {
            return;
        }
        this.recalcRafId = window.requestAnimationFrame(() => {
            this.recalcRafId = undefined;
            this.recalculateCdr3Size();
        });
    }

    private recalculateCdr3Size(): void {
        const viewportHeight = Math.max(window.innerHeight || 0, document.documentElement ? document.documentElement.clientHeight : 0);
        if (viewportHeight <= 0) {
            this.updateCdr3Sizing(undefined, undefined);
            return;
        }

        const topMenu = document.querySelector('.ui.top.fixed.borderless.inverted.menu.large') as HTMLElement | null;
        const headerHeight = topMenu ? Math.max(0, Math.round(topMenu.getBoundingClientRect().height)) : 0;

        const title = document.querySelector('h3.ui.top.attached.header') as HTMLElement | null;
        const titleHeight = title ? Math.max(0, Math.round(title.getBoundingClientRect().height)) : 0;

        const contextHeader = document.querySelector('structure-context-header') as HTMLElement | null;
        const contextHeight = contextHeader ? Math.max(0, Math.round(contextHeader.getBoundingClientRect().height)) : 0;

        const availableHeight = Math.max(
            0,
            viewportHeight
            - headerHeight
            - titleHeight
            - contextHeight
            - StructureCDR3ClustersComponent.cdr3ModeHeaderExtraPadding
            - StructureCDR3ClustersComponent.cdr3ModeViewportBottomPadding
        );

        if (availableHeight <= 0) {
            this.updateCdr3Sizing(undefined, undefined);
            return;
        }

        const widthByHeightLimit = Math.round(availableHeight * StructureCDR3ClustersComponent.cdr3ModeAspectRatio);
        const maxWidth = Math.max(
            StructureCDR3ClustersComponent.cdr3ModeMinWidthPx,
            Math.min(StructureCDR3ClustersComponent.cdr3ModeMaxWidthPx, widthByHeightLimit)
        );
        const maxHeight = Math.round(maxWidth / StructureCDR3ClustersComponent.cdr3ModeAspectRatio);

        this.updateCdr3Sizing(maxWidth, maxHeight);
    }

    private updateCdr3Sizing(width?: number, height?: number): void {
        if (this.cdr3MaxWidthPx === width && this.cdr3MaxHeightPx === height) {
            return;
        }
        this.cdr3MaxWidthPx = width;
        this.cdr3MaxHeightPx = height;
        this.changeDetector.markForCheck();
    }
}

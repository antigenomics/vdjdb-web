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

import { ChangeDetectorRef, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IStructureCluster } from 'pages/structure/structure';
import { StructureDownload, StructureDownloadOption } from 'pages/structure/structure-download';
import { IOverlayTableRow, StructureOverlayRow } from 'pages/structure/structure_overlay_row/structure-overlay-row';
import { StructureService } from 'pages/structure/structure.service';
import { StructureZoomController } from 'pages/structure/structure_zoom/structure-zoom.controller';

@Component({
    selector: 'structure-epitope-cluster',
    templateUrl: './structure-epitope-cluster.component.html',
    styleUrls: ['./structure-epitope-cluster.component.css']
})
export class StructureEpitopeClusterComponent implements OnInit, OnChanges, OnDestroy {
    private static readonly defaultContentMaxWidthPx: number = 960;
    private static readonly cdr3ModeMaskHeadingDeductionPx: number = 180;
    private static readonly cdr3ModeMinWidthPx: number = 560;

    @Input('cluster') public cluster: IStructureCluster;
    @Input('hit') public hit: string;
    @Input('cdr3Pattern') public cdr3Pattern?: string;
    @Input('chain') public chain?: string;
    @Input('isNormalized') public isNormalized: boolean;
    @Input('isCompactInCdr3Mode') public isCompactInCdr3Mode: boolean = false;
    @Input('maxWidthPx') public maxWidthPx?: number;
    @Input('maxHeightPx') public maxHeightPx?: number;
    public htmlVisualization: SafeHtml | undefined;
    public isHtmlVisualizationLoading: boolean = false;
    public zoomState: StructureZoomController;
    public cdr3Info?: IOverlayTableRow;
    public readonly downloadTitle: string = 'Download';
    @ViewChild('zoomCanvas') public set zoomCanvasRef(ref: ElementRef<HTMLElement> | undefined) {
        this.zoomState.attachCanvas(ref ? ref.nativeElement : undefined);
    }
    @ViewChild('zoomViewport') public set zoomViewportRef(ref: ElementRef<HTMLElement> | undefined) {
        this.zoomState.attachViewport(ref ? ref.nativeElement : undefined);
    }

    constructor(private structureService: StructureService,
                private sanitizer: DomSanitizer,
                private changeDetector: ChangeDetectorRef) {
        this.zoomState = new StructureZoomController(this.changeDetector);
    }

    public ngOnInit(): void {
        this.loadHtmlVisualization();
        this.updateCdr3Info();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.cluster && !changes.cluster.firstChange) {
            this.loadHtmlVisualization();
        }
        if (changes.cluster || changes.isCompactInCdr3Mode) {
            this.updateCdr3Info();
        }
    }

    public ngOnDestroy(): void {
        this.zoomState.destroy();
    }

    public onDownloadOptionClick(option: StructureDownloadOption, event: MouseEvent): void {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        StructureDownload.option(this.cluster, option);
    }

    public hasHtmlVisualization(): boolean {
        return !!(this.cluster && this.cluster.visualization && this.cluster.visualization.kind === 'html' && this.htmlVisualization);
    }

    public isHtmlVisualizationRequested(): boolean {
        return !!(this.cluster && this.cluster.visualization && this.cluster.visualization.kind === 'html');
    }

    public get contentMaxWidthPx(): number {
        if (!this.isCompactInCdr3Mode) {
            return StructureEpitopeClusterComponent.defaultContentMaxWidthPx;
        }
        const baseMax = StructureEpitopeClusterComponent.defaultContentMaxWidthPx - StructureEpitopeClusterComponent.cdr3ModeMaskHeadingDeductionPx;
        const cappedMax = this.maxWidthPx ? Math.min(baseMax, this.maxWidthPx) : baseMax;
        return Math.max(StructureEpitopeClusterComponent.cdr3ModeMinWidthPx, cappedMax);
    }

    public get contentMaxHeightPx(): number | undefined {
        if (!this.isCompactInCdr3Mode) {
            return undefined;
        }
        return this.maxHeightPx;
    }

    public get cdr3ClusterIdLabel(): string {
        if (!this.cdr3Info) {
            return '-/-';
        }
        return `${this.cdr3Info.alphaClusterId || '-'}/${this.cdr3Info.betaClusterId || '-'}`;
    }

    public getPatternHelpContent(): string {
        if (!this.cdr3Pattern) {
            return '';
        }
        return `Pattern: ${this.cdr3Pattern.replace(/X/g, 'x')}`;
    }

    public getChainHelpContent(): string {
        if (!this.chain) {
            return '';
        }
        return `Chain: ${this.chain}`;
    }

    private async loadHtmlVisualization(): Promise<void> {
        this.htmlVisualization = undefined;
        this.isHtmlVisualizationLoading = false;

        if (this.cluster && this.cluster.visualization && this.cluster.visualization.kind === 'html') {
            this.isHtmlVisualizationLoading = true;
            const markup = await this.structureService.getHtmlVisualizationMarkup(this.cluster);
            if (markup) {
                this.htmlVisualization = this.sanitizer.bypassSecurityTrustHtml(markup);
            } else {
                this.htmlVisualization = undefined;
            }
            this.isHtmlVisualizationLoading = false;
            this.changeDetector.markForCheck();
        }
    }

    /**
     * The CDR3 lines shown in compact mode.
     *
     * The same shape the overlay card renders, built by the same code: this used to be its own copy
     * of six parsers and the colouring, byte-identical to the entry component's.
     */
    private updateCdr3Info(): void {
        this.cdr3Info = this.isCompactInCdr3Mode && this.cluster
            ? StructureOverlayRow.build(this.cluster, '')
            : undefined;
        this.changeDetector.markForCheck();
    }

}

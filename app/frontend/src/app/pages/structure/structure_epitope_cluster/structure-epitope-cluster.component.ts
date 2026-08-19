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
import { StructureService } from 'pages/structure/structure.service';
import { StructureZoomController } from 'pages/structure/structure_zoom/structure-zoom.controller';
import { Utils } from 'utils/utils';
import ColorizedPatternRegion = Utils.SequencePattern.ColorizedPatternRegion;

type StructureDownloadOption = 'structure' | 'contacts' | 'ca_atoms' | 'all';

interface IParsedChainLabel {
    cdr3?: string;
    v?: string;
    j?: string;
}

interface IParsedPairLabel {
    alpha?: IParsedChainLabel;
    beta?: IParsedChainLabel;
}

interface ICdr3Info {
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
}

const DOWNLOAD_NAME_TOKEN = '{hash}';
const STRUCTURE_DOWNLOAD_FILE_PATTERNS: { [option in StructureDownloadOption]: string } = {
    structure: `aligned_aligned_${DOWNLOAD_NAME_TOKEN}.pdb`,
    contacts: `${DOWNLOAD_NAME_TOKEN}_contacts_aa.txt`,
    ca_atoms: `${DOWNLOAD_NAME_TOKEN}_aa_coordinates.tsv`,
    all: `${DOWNLOAD_NAME_TOKEN}_all.zip`
};

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
    public cdr3Info?: ICdr3Info;
    public readonly downloadTitle: string = 'Download';
    public readonly downloadDirectory: string = '/structure-files/structure';
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
        if (!this.cluster || !this.cluster.clusterId) {
            return;
        }
        const hash = this.cluster.clusterId.trim();
        if (!hash) {
            return;
        }
        const template = STRUCTURE_DOWNLOAD_FILE_PATTERNS[option];
        const fileName = template.replace(DOWNLOAD_NAME_TOKEN, hash);
        const fileUrl = `${this.downloadDirectory}/${encodeURIComponent(fileName)}`;
        this.startDownload(fileUrl, fileName);
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

    private updateCdr3Info(): void {
        if (!this.isCompactInCdr3Mode || !this.cluster) {
            this.cdr3Info = undefined;
            return;
        }
        const pairLabel = this.parsePairLabel(this.cluster.tcrPairLabel);
        const clusterIds = this.parseClusterIds(this.cluster);
        const alpha = pairLabel.alpha || {};
        const beta = pairLabel.beta || {};
        const cdr3a = typeof alpha.cdr3 === 'string' ? alpha.cdr3 : '';
        const cdr3b = typeof beta.cdr3 === 'string' ? beta.cdr3 : '';
        const info: ICdr3Info = {
            alphaClusterId: clusterIds.alpha,
            betaClusterId: clusterIds.beta,
            cdr3a,
            cdr3b,
            cdr3aRegions: this.buildColorizedCdr3(cdr3a, this.cluster.cdr3aVEnd, this.cluster.cdr3aJStart),
            cdr3bRegions: this.buildColorizedCdr3(cdr3b, this.cluster.cdr3bVEnd, this.cluster.cdr3bJStart),
            trav: typeof alpha.v === 'string' ? alpha.v : '',
            traj: typeof alpha.j === 'string' ? alpha.j : '',
            trbv: typeof beta.v === 'string' ? beta.v : '',
            trbj: typeof beta.j === 'string' ? beta.j : ''
        };
        this.cdr3Info = info;
        this.changeDetector.markForCheck();
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
        if (normalized.indexOf('.A.') !== -1 || normalized.indexOf(' A ') !== -1) {
            return 'alpha';
        }
        if (normalized.indexOf('.B.') !== -1 || normalized.indexOf(' B ') !== -1) {
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

    private startDownload(url: string, fileName: string): void {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

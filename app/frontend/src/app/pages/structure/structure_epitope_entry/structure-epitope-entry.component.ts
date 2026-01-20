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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SearchAvailabilityService } from 'pages/search/table/search/search-availability.service';
import { IStructureCluster, IStructureClusterMeta, IStructureEpitope } from 'pages/structure/structure';
import { StructureService, StructuresServiceEvents } from 'pages/structure/structure.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

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
    trav?: string;
    traj?: string;
    trbv?: string;
    trbj?: string;
    hasHtml: boolean;
    motifLink?: string;
    motifAvailable?: boolean;
    motifParams?: IMotifParams;
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
    private subscription: Subscription;
    private overlaySelection: string[] = [];
    private overlayLayerMap: Map<string, { standard?: SafeHtml, simple?: SafeHtml }> = new Map<string, { standard?: SafeHtml, simple?: SafeHtml }>();

    public meta: IStructureClusterMeta;
    public isHidden: boolean = false;
    public overlayError: string | undefined;
    public readonly overlayLimit: number = 5;
    public overlayLayerList: Array<{ id: string, markup: SafeHtml, mode: 'standard' | 'simple' }> = [];
    public overlayTableRows: IOverlayTableRow[] = [];
    @Input('epitope') public epitope: IStructureEpitope;
    @Input('isNormalized') public isNormalized: boolean;
    @Output('onDiscard') public onDiscard = new EventEmitter<IStructureEpitope>();

    constructor(private structureService: StructureService, private availability: SearchAvailabilityService,
                private changeDetector: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

    public ngOnInit(): void {
        this.meta = this.epitope.clusters[0].meta;
        this.subscription = this.structureService.getEvents().pipe(filter((event) => event === StructuresServiceEvents.HIDE_CLUSTERS)).subscribe(() => {
            this.isHidden = true;
            this.changeDetector.markForCheck();
        });
        this.overlayTableRows = this.epitope.clusters.map((cluster) => this.buildOverlayRow(cluster));
        this.loadMotifAvailability();
        this.initializeOverlaySelection();
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

    public onRowToggle(row: IOverlayTableRow): void {
        if (!row) {
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
        } else {
            const index = this.overlaySelection.indexOf(cluster.clusterId);
            if (index !== -1) {
                this.overlaySelection.splice(index, 1);
                this.overlayLayerMap.delete(cluster.clusterId);
                this.structureService.releaseHtmlVisualizationMarkup(cluster);
                this.updateOverlayLayerList();
                this.overlayError = undefined;
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

    public computeOverlayOpacity(index: number): number {
        if (index === 0) {
            return 1;
        }
        const total = this.overlayLayerList.length;
        if (total <= 1) {
            return 1;
        }
        const minOpacity = 0.25;
        const steps = total - 1;
        const range = 1 - minOpacity;
        const step = steps > 0 ? range / steps : range;
        const value = 1 - step * index;
        return value < minOpacity ? minOpacity : value;
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
        this.changeDetector.markForCheck();
    }

    private updateOverlayLayerList(): void {
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
        this.changeDetector.markForCheck();
    }

    private buildOverlayRow(cluster: IStructureCluster): IOverlayTableRow {
        const pairLabel = this.parsePairLabel(cluster.tcrPairLabel);
        const clusterIds = this.parseClusterIds(cluster);
        const alpha = pairLabel.alpha || {};
        const beta = pairLabel.beta || {};
        const meta = cluster.meta || {} as IStructureClusterMeta;
        const motifParams = this.buildMotifParams(meta, this.epitope.epitope);
        const motifLink = motifParams ? this.buildMotifLink(motifParams) : undefined;

        return {
            cluster,
            alphaClusterId: clusterIds.alpha,
            betaClusterId: clusterIds.beta,
            cdr3a: typeof alpha.cdr3 === 'string' ? alpha.cdr3 : '',
            cdr3b: typeof beta.cdr3 === 'string' ? beta.cdr3 : '',
            trav: typeof alpha.v === 'string' ? alpha.v : '',
            traj: typeof alpha.j === 'string' ? alpha.j : '',
            trbv: typeof beta.v === 'string' ? beta.v : '',
            trbj: typeof beta.j === 'string' ? beta.j : '',
            hasHtml: !!(cluster.visualization && cluster.visualization.kind === 'html'),
            motifParams,
            motifLink
        };
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
        this.overlaySelection.forEach((id) => this.structureService.releaseHtmlVisualizationMarkup(id));
        if (this.subscription) {
            this.subscription.unsubscribe();
        }
    }
}

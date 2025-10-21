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
import { IStructureClusterMeta, IStructureCluster, IStructureEpitope } from 'pages/structure/structure';
import { StructuresServiceEvents } from 'pages/structure/structure.service';
import { StructureService } from 'pages/structure/structure.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
    selector:        'structure-epitope-entry',
    templateUrl:     './structure-epitope-entry.component.html',
    styleUrls:       [ './structure-epitope-entry.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StructureEpitopeEntryComponent implements OnInit, OnDestroy {
    private subscription: Subscription;
    public meta: IStructureClusterMeta;
    public isHidden: boolean = false;
    public overlayEnabled: boolean = false;
    public overlayError: string | null = null;
    public readonly overlayLimit: number = 5;
    public overlayLayerList: Array<{ id: string, markup: SafeHtml, mode: 'standard' | 'simple' }> = [];
    @Input('epitope') public epitope: IStructureEpitope;
    @Input('isNormalized') public isNormalized: boolean;
    @Output('onDiscard') public onDiscard = new EventEmitter<IStructureEpitope>();

    private overlaySelection: string[] = [];
    private overlayLayerMap: Map<string, { standard?: SafeHtml, simple?: SafeHtml }> = new Map<string, { standard?: SafeHtml, simple?: SafeHtml }>();

    constructor(private structureService: StructureService, private changeDetector: ChangeDetectorRef,
                private sanitizer: DomSanitizer) {}

    public ngOnInit(): void {
        this.meta = this.epitope.clusters[0].meta;
        this.subscription = this.structureService.getEvents().pipe(filter((event) => event === StructuresServiceEvents.HIDE_CLUSTERS)).subscribe(() => {
            this.isHidden = true;
            this.changeDetector.markForCheck();
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

    public toggleOverlay(enabled: boolean): void {
        this.overlayEnabled = enabled;
        this.overlayError = null;
        this.overlaySelection = [];
        this.overlayLayerMap.clear();
        this.overlayLayerList = [];

        if (enabled) {
            const htmlCapable = this.epitope.clusters.filter((cluster) => cluster.visualization && cluster.visualization.kind === 'html');
            if (htmlCapable.length === 0) {
                this.overlayError = 'No structures with HTML visualization are available for overlay.';
            } else {
                htmlCapable.slice(0, this.overlayLimit).forEach((cluster) => {
                    if (cluster && cluster.clusterId) {
                        this.overlaySelection.push(cluster.clusterId);
                        this.ensureOverlayLayer(cluster);
                    }
                });
                this.updateOverlayLayerList();
            }
        }

        this.changeDetector.markForCheck();
    }

    public isClusterSelected(cluster: IStructureCluster): boolean {
        return this.overlaySelection.indexOf(cluster.clusterId) !== -1;
    }

    public get overlaySelectionCount(): number {
        return this.overlaySelection.length;
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
            this.overlayError = null;
            this.ensureOverlayLayer(cluster);
        } else {
            const index = this.overlaySelection.indexOf(cluster.clusterId);
            if (index !== -1) {
                this.overlaySelection.splice(index, 1);
                this.overlayLayerMap.delete(cluster.clusterId);
                this.updateOverlayLayerList();
                this.overlayError = null;
                this.changeDetector.markForCheck();
            }
        }
    }

    public isOverlayCheckboxDisabled(cluster: IStructureCluster): boolean {
        if (!cluster.visualization || cluster.visualization.kind !== 'html') {
            return !this.isClusterSelected(cluster);
        }
        return !this.isClusterSelected(cluster) && this.overlaySelection.length >= this.overlayLimit;
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
        this.overlayError = null;
        this.updateOverlayLayerList();
        this.changeDetector.markForCheck();
    }

    private updateOverlayLayerList(): void {
        this.overlayLayerList = this.overlaySelection
            .map((id, index) => {
                const entry = this.overlayLayerMap.get(id);
                if (!entry || !entry.standard) {
                    return null;
                }
                const mode: 'standard' | 'simple' = index === 0 ? 'standard' : 'simple';
                const markup = mode === 'simple' ? (entry.simple || entry.standard) : entry.standard;
                return markup ? { id, markup, mode } : null;
            })
            .filter((entry): entry is { id: string, markup: SafeHtml, mode: 'standard' | 'simple' } => entry !== null);
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }
}

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

import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ChangeDetectorRef } from '@angular/core';
import { IStructureCluster } from 'pages/structure/structure';
import { StructureService } from 'pages/structure/structure.service';
import { Utils } from 'utils/utils';

@Component({
    selector: 'structure-epitope-cluster',
    templateUrl: './structure-epitope-cluster.component.html',
    styleUrls: ['./structure-epitope-cluster.component.css']
})
export class StructureEpitopeClusterComponent implements OnInit, OnChanges {
    @Input('cluster') public cluster: IStructureCluster;
    @Input('hit') public hit: string;
    @Input('isNormalized') public isNormalized: boolean;
    public htmlVisualization: SafeHtml | undefined;
    public isHtmlVisualizationLoading: boolean = false;

    constructor(private structureService: StructureService,
                private sanitizer: DomSanitizer,
                private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this.loadHtmlVisualization();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.cluster && !changes.cluster.firstChange) {
            this.loadHtmlVisualization();
        }
    }

    public exportCID(): void {
        this.structureService.members(this.cluster.clusterId);
    }

    public hasHtmlVisualization(): boolean {
        return !!(this.cluster && this.cluster.visualization && this.cluster.visualization.kind === 'html' && this.htmlVisualization);
    }

    public isHtmlVisualizationRequested(): boolean {
        return !!(this.cluster && this.cluster.visualization && this.cluster.visualization.kind === 'html');
    }

    public getImageVisualizationUrl(): string | undefined {
        if (this.cluster && this.cluster.visualization && this.cluster.visualization.kind === 'image') {
            return this.cluster.visualization.url;
        }
        return undefined;
    }

    private loadHtmlVisualization(): void {
        this.htmlVisualization = undefined;
        this.isHtmlVisualizationLoading = false;

        if (this.cluster && this.cluster.visualization && this.cluster.visualization.kind === 'html') {
            const url = this.cluster.visualization.url;
            if (url) {
                this.isHtmlVisualizationLoading = true;
                Utils.HTTP.get(url).then((response) => {
                    const markup = this.extractSvgMarkup(response.response);
                    this.htmlVisualization = this.sanitizer.bypassSecurityTrustHtml(markup);
                    this.isHtmlVisualizationLoading = false;
                    this.changeDetector.markForCheck();
                }).catch(() => {
                    this.htmlVisualization = undefined;
                    this.isHtmlVisualizationLoading = false;
                    this.changeDetector.markForCheck();
                });
            }
        }
    }

    private extractSvgMarkup(source: string): string {
        if (!source) {
            return '';
        }
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(source, 'text/html');
            const svg = doc.querySelector('svg');
            if (svg) {
                svg.setAttribute('width', '100%');
                svg.setAttribute('height', '100%');
                return svg.outerHTML;
            }
            return source;
        } catch {
            return source;
        }
    }
}

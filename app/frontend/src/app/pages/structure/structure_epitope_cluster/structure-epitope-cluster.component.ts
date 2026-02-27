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

@Component({
    selector: 'structure-epitope-cluster',
    templateUrl: './structure-epitope-cluster.component.html',
    styleUrls: ['./structure-epitope-cluster.component.css']
})
export class StructureEpitopeClusterComponent implements OnInit, OnChanges, OnDestroy {
    @Input('cluster') public cluster: IStructureCluster;
    @Input('hit') public hit: string;
    @Input('isNormalized') public isNormalized: boolean;
    public htmlVisualization: SafeHtml | undefined;
    public isHtmlVisualizationLoading: boolean = false;
    public zoomState: StructureZoomController;
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
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.cluster && !changes.cluster.firstChange) {
            this.loadHtmlVisualization();
        }
    }

    public ngOnDestroy(): void {
        this.zoomState.destroy();
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
}

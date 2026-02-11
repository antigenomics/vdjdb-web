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

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
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
export class StructureCDR3ClustersComponent {
    private isHitboxVisible: boolean = true;
    public top: number = 5;
    @Input('options')
    public options: IStructureEpitopeViewOptions;
    @Input('clusters')
    public clusters: IStructureCDR3SearchResult;

    public getClustersEntries(): IStructureCDR3SearchEntry[] {
        let entries: IStructureCDR3SearchEntry[];
        if (this.options && this.options.isNormalized) {
            entries = this.clusters.clustersNorm;
        } else {
            entries = this.clusters.clusters;
        }
        return entries.slice(0, this.top);
    }

    public getCDR3Hitbox(entry: IStructureCDR3SearchEntry): string {
        return this.isHitboxVisible ? entry.cdr3 : undefined;
    }

    public getCDR3SubstringHelpContent(entry: IStructureCDR3SearchEntry): string {
        return entry.cdr3.indexOf('X') !== -1 ? `Pattern: ${entry.cdr3.replace(/X/g, 'x')}` : '';
    }

    public toggleHitboxVisibility(): void {
        this.isHitboxVisible = !this.isHitboxVisible;
    }

    public setTop(top: number): void {
        this.top = top;
    }
}

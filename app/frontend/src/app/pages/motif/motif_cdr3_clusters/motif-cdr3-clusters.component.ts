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

import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { IMotifCDR3SearchEntry, IMotifCDR3SearchResult, IMotifEpitopeViewOptions } from 'pages/motif/motif';

@Component({
  selector:        'motif-cdr3-clusters',
  templateUrl:     './motif-cdr3-clusters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifCDR3ClustersComponent implements OnChanges {
  private isHitboxVisible: boolean = true;

  public top: number = 5;

  @Input('options')
  public options: IMotifEpitopeViewOptions;

  @Input('clusters')
  public clusters: IMotifCDR3SearchResult;

  // Cached so the template *ngFor doesn't get a new array (and re-render every seqlogo) on each
  // change-detection cycle. Recomputed only when inputs or the visible count change.
  public clustersEntries: IMotifCDR3SearchEntry[] = [];

  public ngOnChanges(): void {
    this.recomputeEntries();
  }

  public trackEntry(_: number, entry: IMotifCDR3SearchEntry): string {
    return entry.cluster.clusterId;
  }

  private recomputeEntries(): void {
    if (!this.clusters) {
      this.clustersEntries = [];
      return;
    }
    const entries = (this.options && this.options.isNormalized) ? this.clusters.clustersNorm : this.clusters.clusters;
    this.clustersEntries = (entries || []).slice(0, this.top);
  }

  public getCDR3Hitbox(entry: IMotifCDR3SearchEntry): string {
    return this.isHitboxVisible ? entry.cdr3 : undefined;
  }

  public getCDR3SubstringHelpContent(entry: IMotifCDR3SearchEntry): string {
    return entry.cdr3.indexOf('X') !== -1 ? `Pattern: ${entry.cdr3.replace(/X/g, 'x')}` : '';
  }

  public toggleHitboxVisibility(): void {
    this.isHitboxVisible = !this.isHitboxVisible;
  }

  public setTop(top: number): void {
    this.top = top;
    this.recomputeEntries();
  }
}

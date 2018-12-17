/*
 *     Copyright 2017-2018 Bagaev Dmitry
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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { MotifSearchTreeGene } from 'pages/motif/motif_search_tree/motif-search-tree';

@Component({
  selector:        'div[motif-search-gene]',
  templateUrl:     './motif-search-gene.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifSearchGeneComponent {
  @Input('gene')
  public gene: MotifSearchTreeGene;

  constructor(private changeDetector: ChangeDetectorRef) {}

  public open(): void {
    this.gene.isOpened = true;
    this.changeDetector.detectChanges();
  }

  public close(): void {
    this.gene.isOpened = false;
    this.changeDetector.detectChanges();
  }
}
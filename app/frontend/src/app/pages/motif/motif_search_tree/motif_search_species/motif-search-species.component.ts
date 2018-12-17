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
import { MotifSearchTreeSpecies } from 'pages/motif/motif_search_tree/motif-search-tree';

@Component({
  selector:        'div[motif-search-species]',
  templateUrl:     './motif-search-species.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifSearchSpeciesComponent {
  @Input('species')
  public species: MotifSearchTreeSpecies;

  constructor(private changeDetector: ChangeDetectorRef) {}

  public open(): void {
    this.species.isOpened = true;
    this.changeDetector.detectChanges();
  }

  public close(): void {
    this.species.isOpened = false;
    this.changeDetector.detectChanges();
  }
}
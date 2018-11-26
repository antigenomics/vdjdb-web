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
import { MotifEpitope } from 'pages/motif/motif';
import { MotifService } from 'pages/motif/motif.service';
import { MotifSearchTreeMHCGroup } from 'pages/motif/motif_search_tree/motif-search-tree';

@Component({
  selector:        'div[motif-search-mhcgroup]',
  templateUrl:     './motif-search-mhcgroup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifSearchMhcgroupComponent {
  @Input('mhcgroup')
  public mhcgroup: MotifSearchTreeMHCGroup;

  constructor(private motifs: MotifService, private changeDetector: ChangeDetectorRef) {}

  public open(): void {
    this.mhcgroup.isOpened = true;
    this.changeDetector.detectChanges();
  }

  public close(): void {
    this.mhcgroup.isOpened = false;
    this.changeDetector.detectChanges();
  }

  public switchEpitope(epitope: MotifEpitope): void {
    epitope.isSelected = !epitope.isSelected;
    this.motifs.fireSelectedUpdate();
  }
}
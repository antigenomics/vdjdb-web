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

import { ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { IMotifsMetadata, IMotifsMetadataTreeLevelValue, IMotifsSearchTreeFilter, IMotifEpitopeViewOptions } from 'pages/motif/motif';
import { MotifService } from 'pages/motif/motif.service';

@Component({
  selector:        'motif-search-tree',
  templateUrl:     './motif-search-tree.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifSearchTreeComponent implements OnChanges {
  @Input('metadata')
  public metadata: IMotifsMetadata;

  @Input('selected')
  public selected: IMotifsMetadataTreeLevelValue[];

  @Input('options')
  public options: IMotifEpitopeViewOptions;

  constructor(private motifService: MotifService, private router: Router) {}

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes['options']) {
      const prev = changes['options'].previousValue as IMotifEpitopeViewOptions;
      const curr = changes['options'].currentValue as IMotifEpitopeViewOptions;
      if (curr && curr.allowMultiple && (!prev || !prev.allowMultiple)) {
        this.router.navigate([], { queryParams: { method: this.motifService.getMethod() }, replaceUrl: true });
      }
    }
  }

  public onFilterReceived(filter: IMotifsSearchTreeFilter): void {
    if (!this.options || !this.options.allowMultiple) {
      // Exclusive select: discard all previous selections except the one being selected
      if (this.selected) {
        const leafEntry = filter.entries.find((e) => e.name === 'antigen.epitope');
        this.selected
          .filter((s) => !leafEntry || s.value !== leafEntry.value)
          .forEach((s) => this.motifService.discardTreeLevelValue(s));
      }
      this.motifService.clearEpitopes();
      this.motifService.select(filter);
      const urlParams = this.filterToUrlParams(filter);
      this.motifService.setLastEpitopeUrlParams(urlParams);
      this.router.navigate([], { queryParams: urlParams, replaceUrl: true });
    } else {
      this.motifService.select(filter);
    }
  }

  public onDiscardReceived(_filter: IMotifsSearchTreeFilter): void {
    this.motifService.discard(_filter);
    if (!this.options || !this.options.allowMultiple) {
      this.motifService.setLastEpitopeUrlParams(null);
      this.router.navigate([], { queryParams: { method: this.motifService.getMethod() }, replaceUrl: true });
    }
  }

  public isSelectedExist(): boolean {
    return this.selected && this.selected.length !== 0;
  }

  public hasMultipleSelected(): boolean {
    return this.selected && this.selected.length > 1;
  }

  public discardAll(): void {
    this.selected.forEach((s) => this.motifService.discardTreeLevelValue(s));
    this.motifService.updateSelected();
    setTimeout(() => {
      this.motifService.updateEpitopes();
    });
    if (!this.options || !this.options.allowMultiple) {
      this.motifService.setLastEpitopeUrlParams(null);
      this.router.navigate([], { queryParams: { method: this.motifService.getMethod() }, replaceUrl: true });
    }
  }

  public hideAll(): void {
    this.motifService.fireHideEvent();
  }

  private filterToUrlParams(filter: IMotifsSearchTreeFilter): { [key: string]: string } {
    const params: { [key: string]: string } = { method: this.motifService.getMethod() };
    const reversedEntries = [...filter.entries].reverse();
    reversedEntries.forEach((entry) => {
      switch (entry.name) {
        case 'species':          params['species'] = entry.value; break;
        case 'gene':             params['tcr_chain'] = entry.value; break;
        case 'mhc.class':        params['mhc_class'] = entry.value; break;
        case 'mhc.a':            params['gene'] = entry.value; break;
        case 'antigen.epitope':  params['epitope_seq'] = entry.value; break;
      }
    });
    return params;
  }
}

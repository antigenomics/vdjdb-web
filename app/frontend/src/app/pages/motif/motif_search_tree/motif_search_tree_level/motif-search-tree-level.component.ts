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

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MotifsMetadataTreeLevel, MotifsMetadataTreeLevelValue, MotifsSearchTreeFilter } from 'pages/motif/motif';

@Component({
  selector:        'div[motif-search-tree-level]',
  templateUrl:     './motif-search-tree-level.component.html',
  styleUrls:       [ './motif-search-tree-level.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifSearchTreeLevelComponent {
  @Input('level')
  public level: MotifsMetadataTreeLevel;

  @Output('onFilter')
  public onFilter = new EventEmitter<MotifsSearchTreeFilter>();

  public open(value: MotifsMetadataTreeLevelValue): void {
    value.isOpened = true;
  }

  public close(value: MotifsMetadataTreeLevelValue): void {
    value.isOpened = false;
  }

  public header(value: MotifsMetadataTreeLevelValue): void {
    if (value.next !== null) {
      value.isOpened = !value.isOpened;
    } else {
      this.startFilter(value);
    }
  }

  public pushFilter(value: MotifsMetadataTreeLevelValue, filter: MotifsSearchTreeFilter): void {
    this.onFilter.emit({ entries: [ ...filter.entries, { name: this.level.name, value: value.value } ] });
  }

  public startFilter(value: MotifsMetadataTreeLevelValue): void {
    this.onFilter.emit({ entries: [ { name: this.level.name, value: value.value } ] });
  }

  public isSelected(value: MotifsMetadataTreeLevelValue): boolean {
    if (value.next !== null) {
      return value.next.values.reduce((previous, current) => previous && this.isSelected(current), true);
    } else {
      return value.isSelected;
    }
  }
}
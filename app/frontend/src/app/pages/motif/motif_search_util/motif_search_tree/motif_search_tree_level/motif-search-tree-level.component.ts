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
import { IMotifsMetadataTreeLevel, IMotifsMetadataTreeLevelValue, IMotifsSearchTreeFilter } from 'pages/motif/motif';
import { MotifService, MotifsServiceEvents } from 'pages/motif/motif.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector:        'div[motif-search-tree-level]',
  templateUrl:     './motif-search-tree-level.component.html',
  styleUrls:       [ './motif-search-tree-level.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifSearchTreeLevelComponent implements OnInit, OnDestroy {
  private subscription: Subscription;

  @Input('level')
  public level: IMotifsMetadataTreeLevel;

  @Output('onSelect')
  public onSelect = new EventEmitter<IMotifsSearchTreeFilter>();

  @Output('onDiscard')
  public onDiscard = new EventEmitter<IMotifsSearchTreeFilter>();

  constructor(private motifService: MotifService, private changeDetector: ChangeDetectorRef) {}

  public ngOnInit(): void {
    this.subscription = this.motifService.getEvents().pipe(filter((event) => event === MotifsServiceEvents.UPDATE_SELECTED)).subscribe(() => {
      this.changeDetector.detectChanges();
    });
  }

  public open(value: IMotifsMetadataTreeLevelValue): void {
    value.isOpened = true;
  }

  public close(value: IMotifsMetadataTreeLevelValue): void {
    value.isOpened = false;
  }

  public header(value: IMotifsMetadataTreeLevelValue): void {
    if (value.next !== null) {
      value.isOpened = !value.isOpened;
    } else {
      if (value.isSelected) {
        this.discard(value);
      } else {
        this.select(value);
      }
    }
  }

  public pushSelect(value: IMotifsMetadataTreeLevelValue, treeFilter: IMotifsSearchTreeFilter): void {
    this.onSelect.emit({ entries: [ ...treeFilter.entries, { name: this.level.name, value: value.value } ] });
  }

  public select(value: IMotifsMetadataTreeLevelValue): void {
    this.motifService.selectTreeLevelValue(value);
    this.onSelect.emit({ entries: [ { name: this.level.name, value: value.value } ] });
  }

  public pushDiscard(value: IMotifsMetadataTreeLevelValue, treeFilter: IMotifsSearchTreeFilter): void {
    this.onDiscard.emit({ entries: [ ...treeFilter.entries, { name: this.level.name, value: value.value } ] });
  }

  public discard(value: IMotifsMetadataTreeLevelValue): void {
    this.motifService.discardTreeLevelValue(value);
    this.onDiscard.emit({ entries: [ { name: this.level.name, value: value.value } ] });
  }

  public isSelected(value: IMotifsMetadataTreeLevelValue): boolean {
    return this.motifService.isTreeLevelValueSelected(value);
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}

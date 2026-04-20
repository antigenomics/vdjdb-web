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
import { IStructuresMetadataTreeLevel, IStructuresMetadataTreeLevelValue, IStructuresSearchTreeFilter } from 'pages/structure/structure';
import { StructureService, StructuresServiceEvents } from 'pages/structure/structure.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector:        'div[structure-search-tree-level]',
  templateUrl:     './structure-search-tree-level.component.html',
  styleUrls:       [ './structure-search-tree-level.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StructureSearchTreeLevelComponent implements OnInit, OnDestroy {
  private subscription: Subscription;

  @Input('level')
  public level: IStructuresMetadataTreeLevel;

  @Output('onSelect')
  public onSelect = new EventEmitter<IStructuresSearchTreeFilter>();

  @Output('onDiscard')
  public onDiscard = new EventEmitter<IStructuresSearchTreeFilter>();

  constructor(private structureService: StructureService, private changeDetector: ChangeDetectorRef) {}

  public ngOnInit(): void {
    this.subscription = this.structureService.getEvents().pipe(filter((event) => event === StructuresServiceEvents.UPDATE_SELECTED)).subscribe(() => {
      this.changeDetector.detectChanges();
    });
  }

  public open(value: IStructuresMetadataTreeLevelValue): void {
    value.isOpened = true;
  }

  public close(value: IStructuresMetadataTreeLevelValue): void {
    value.isOpened = false;
  }

  public header(value: IStructuresMetadataTreeLevelValue): void {
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

  public pushSelect(value: IStructuresMetadataTreeLevelValue, treeFilter: IStructuresSearchTreeFilter): void {
    this.onSelect.emit({ entries: [ ...treeFilter.entries, { name: this.level.name, value: value.value } ] });
  }

  public select(value: IStructuresMetadataTreeLevelValue): void {
    this.structureService.selectTreeLevelValue(value);
    this.onSelect.emit({ entries: [ { name: this.level.name, value: value.value } ] });
  }

  public pushDiscard(value: IStructuresMetadataTreeLevelValue, treeFilter: IStructuresSearchTreeFilter): void {
    this.onDiscard.emit({ entries: [ ...treeFilter.entries, { name: this.level.name, value: value.value } ] });
  }

  public discard(value: IStructuresMetadataTreeLevelValue): void {
    this.structureService.discardTreeLevelValue(value);
    this.onDiscard.emit({ entries: [ { name: this.level.name, value: value.value } ] });
  }

  public isSelected(value: IStructuresMetadataTreeLevelValue): boolean {
    return this.structureService.isTreeLevelValueSelected(value);
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}

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
import { IStructuresMetadata, IStructuresMetadataTreeLevelValue, IStructuresSearchTreeFilter } from 'pages/structure/structure';
import { StructureService } from 'pages/structure/structure.service';

@Component({
  selector:        'structure-search-tree',
  templateUrl:     './structure-search-tree.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StructureSearchTreeComponent {
  @Input('metadata')
  public metadata: IStructuresMetadata;

  @Input('selected')
  public selected: IStructuresMetadataTreeLevelValue[];

  constructor(private structureService: StructureService) {}

  public onFilterReceived(filter: IStructuresSearchTreeFilter): void {
    this.structureService.select(filter);
  }

  public onDiscardReceived(filter: IStructuresSearchTreeFilter): void {
    this.structureService.discard(filter);
  }

  public isSelectedExist(): boolean {
    return this.selected && this.selected.length !== 0;
  }

  public discardAll(): void {
    this.selected.forEach((s) => this.structureService.discardTreeLevelValue(s));
    this.structureService.updateSelected();
    setTimeout(() => {
      this.structureService.updateEpitopes();
    });
  }

  public hideAll(): void {
    this.structureService.fireHideEvent();
  }
}

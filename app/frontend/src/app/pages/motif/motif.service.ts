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

import { Injectable } from '@angular/core';
import {
  MotifsMappedFlatMetadata,
  MotifsMetadata,
  MotifsMetadataTreeLevel,
  MotifsMetadataTreeLevelValue,
  MotifsSearchTreeFilter,
  MotifsSearchTreeFilterResult
} from 'pages/motif/motif';
import { Observable, ReplaySubject, Subject } from 'rxjs';
import { LoggerService } from 'utils/logger/logger.service';
import { Utils } from 'utils/utils';
import { take } from 'rxjs/operators';

export namespace MotifsServiceWebSocketActions {
  export const METADATA = 'meta';
}

@Injectable()
export class MotifService {
  private isMetadataLoaded: boolean = false;
  private isMetadataLoading: boolean = false;

  private metadata: Subject<MotifsMetadata> = new ReplaySubject(1);

  // private selected: Subject<MotifEpitope[]> = new ReplaySubject(1);

  constructor(private logger: LoggerService) {}

  public async load(): Promise<void> {
    if (!this.isMetadataLoaded && !this.isMetadataLoading) {
      this.isMetadataLoading = true;
      const response = await Utils.HTTP.get('/api/motifs/metadata');
      const root = JSON.parse(response.response) as { root: MotifsMetadataTreeLevel };
      const flat = MotifService.convertMetadataToFlatFormat(root.root);
      const metadata = { root: root.root, flat: flat };
      this.logger.debug('Motifs metadata', metadata);

      this.metadata.next(metadata);

      this.isMetadataLoaded = true;
      this.isMetadataLoading = false;
    }
  }

  public getMetadata(): Observable<MotifsMetadata> {
    return this.metadata.asObservable();
  }

  public filter(filter: MotifsSearchTreeFilter): void {
    Utils.HTTP.post('/api/motifs/filter', filter).then((response) => {
      const result = JSON.parse(response.response) as MotifsSearchTreeFilterResult;
      console.log(result);
      this.metadata.pipe(take(1)).subscribe((metadata) => {
        result.epitopes.forEach((epitope) => {
          metadata.flat[ epitope.epitope ].isSelected = true;
        });
        console.log(metadata);
      });
    });
  }

  // public getSelected(): Observable<MotifEpitope[]> {
  //   return this.selected.asObservable();
  // }

  // public fireSelectedUpdate(): void {
  //   this.metadata.subscribe((meta) => {
  //     const selected: MotifEpitope[] = ([] as MotifEpitope[]).concat(...meta.entries.map((e) =>
  //       ([] as MotifEpitope[]).concat(...e.epitopes.filter((p) => p.isSelected))
  //     ));
  //     this.selected.next(selected);
  //   });
  // }

  public isTreeLevelValueSelected(value: MotifsMetadataTreeLevelValue): boolean {
    if (value.next !== null) {
      return value.next.values.reduce((previous, current) => previous && this.isTreeLevelValueSelected(current), true);
    } else {
      return value.isSelected;
    }
  }

  private static convertMetadataToFlatFormat(root: MotifsMetadataTreeLevel): MotifsMappedFlatMetadata {
    const leafs = MotifService.extractMetadataTreeLeafValues(root);
    const map: MotifsMappedFlatMetadata = {};
    leafs.forEach((leaf) => {
      map[ leaf[ 0 ] ] = leaf[ 1 ];
    });
    return map;
  }

  private static extractMetadataTreeLeafValues(tree: MotifsMetadataTreeLevel): Array<[ string, MotifsMetadataTreeLevelValue ]> {
    return Utils.Array.flattened(tree.values.map((v) => {
      if (v.next === null) {
        return [ [ v.value, v ] ] as Array<[ string, MotifsMetadataTreeLevelValue ]>;
      } else {
        return MotifService.extractMetadataTreeLeafValues(v.next);
      }
    }));
  }

}
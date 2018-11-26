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

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { ChartEventType } from 'shared/charts/chart-events';
import { MotifCluster } from '../../motif';

@Component({
  selector:        'motif-cluster',
  templateUrl:     './motif-cluster.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifClusterComponent {
  public cluster: MotifCluster;
  public stream = new ReplaySubject(1);

  @Input('cluster')
  public set setCluster(cluster: MotifCluster) {
    this.cluster = cluster;
    const data = cluster.entries.map((entry) => {
      return {
        pos:   entry.pos,
        chars: entry.aa.map((a) => ({ c: a.aa, h: a.H })).sort((d1, d2) => d1.h > d2.h ? -1 : d1.h < d2.h ? 1 : 0)
      };
    });
    this.stream.next({
      type: ChartEventType.INITIAL_DATA,
      data: data
    });
  }
}
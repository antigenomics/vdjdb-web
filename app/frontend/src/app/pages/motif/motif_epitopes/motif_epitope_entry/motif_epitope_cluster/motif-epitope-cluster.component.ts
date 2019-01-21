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

import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { MotifCluster } from 'pages/motif/motif';
import { ReplaySubject } from 'rxjs';
import { ChartEventType } from 'shared/charts/chart-events';
import { ISeqLogoChartDataEntry, SeqLogoChartStreamType } from 'shared/charts/seqlogo/seqlogo-chart';

@Component({
  selector:        'motif-epitope-cluster',
  templateUrl:     './motif-epitope-cluster.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifEpitopeClusterComponent implements OnInit {
  private isNormalized: boolean = false;

  public stream: SeqLogoChartStreamType = new ReplaySubject(1);

  @Input('cluster')
  public cluster: MotifCluster;

  @Input('isNormalized')
  public set setIsNormalized(isNormalized: boolean) {
    if (this.isNormalized !== isNormalized) {
      this.isNormalized = isNormalized;
      this.updateStream(ChartEventType.UPDATE_DATA);
    }
  }

  public ngOnInit(): void {
    this.updateStream(ChartEventType.INITIAL_DATA);
  }

  public updateStream(type: ChartEventType): void {
    this.stream.next({ type: type, data: this.createData() });
  }

  public createData(): ISeqLogoChartDataEntry[] {
    return this.cluster.entries.map((entry) => {
      return {
        pos:   entry.position,
        chars: entry.aa.map((aa) => ({ c: aa.letter, h: this.isNormalized ? aa.HNorm : aa.H })).sort((e1, e2) => e2.h - e1.h)
      };
    });
  }
}
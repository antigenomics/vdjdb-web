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


import { AfterViewInit, ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { MotifsMetadata } from 'pages/motif/motif';
import { MotifService } from 'pages/motif/motif.service';
import { ReplaySubject } from 'rxjs';
import { take } from 'rxjs/operators';
import { ChartEventType } from 'shared/charts/chart-events';
import { ISeqLogoChartDataEntry, SeqLogoChartStreamType } from 'shared/charts/seqlogo/seqlogo-chart';

@Component({
  selector:        'motif',
  templateUrl:     './motif.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifPageComponent implements OnInit, AfterViewInit {

  public stream: SeqLogoChartStreamType = new ReplaySubject(1);

  constructor(private motifService: MotifService) {}

  public ngOnInit(): void {
    // noinspection JSIgnoredPromiseFromCall
    this.motifService.load();
  }

  public ngAfterViewInit(): void {
    this.motifService.getMetadata().pipe(take(1)).subscribe((metadata: MotifsMetadata) => {
      const data: ISeqLogoChartDataEntry[] = metadata.entries[ 0 ].epitopes[ 0 ].clusters[ 0 ].entries.map((entry) => {
        return {
          pos:   entry.pos,
          chars: entry.aa.map((a) => ({ c: a.aa, h: a.H })).sort((d1, d2) => d1.h > d2.h ? -1 : d1.h < d2.h ? 1 : 0)
        };
      });
      console.log(data);
      this.stream.next({
        type: ChartEventType.INITIAL_DATA,
        data: data
      });
    });
  }

}
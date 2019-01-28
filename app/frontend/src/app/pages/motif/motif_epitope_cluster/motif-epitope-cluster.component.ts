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

import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MotifCluster } from 'pages/motif/motif';
import { MotifService, MotifsServiceEvents } from 'pages/motif/motif.service';
import { ReplaySubject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ChartEventType } from 'shared/charts/chart-events';
import { ISeqLogoChartDataEntry, SeqLogoChartStreamType } from 'shared/charts/seqlogo/seqlogo-chart';
import { ISeqLogoChartConfiguration } from 'shared/charts/seqlogo/seqlogo-configuration';

@Component({
  selector:        'motif-epitope-cluster',
  templateUrl:     './motif-epitope-cluster.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifEpitopeClusterComponent implements OnInit, OnDestroy {
  private onScrollObservable: Subscription;
  private onResizeObservable: Subscription;
  private isNormalized: boolean;

  public isRendered: boolean = false;
  public stream: SeqLogoChartStreamType = new ReplaySubject(1);
  public configuration: ISeqLogoChartConfiguration = MotifService.clusterViewportChartConfiguration;

  @ViewChild('HeaderContent', { read: ElementRef })
  public HeaderContent: ElementRef;

  @Input('cluster')
  public cluster: MotifCluster;

  @Input('hit')
  public hit?: string;

  @Input('isNormalized')
  public set setIsNormalized(isNormalized: boolean) {
    if (this.isNormalized !== isNormalized) {
      this.isNormalized = isNormalized;
      this.updateIfInViewport(ChartEventType.UPDATE_DATA);
    }
  }

  constructor(private motifService: MotifService) {}

  public ngOnInit(): void {
    this.onScrollObservable = this.motifService.getEvents().pipe(filter((event) => event === MotifsServiceEvents.UPDATE_SCROLL)).subscribe(() => {
      if (!this.isRendered) {
        this.updateIfInViewport(ChartEventType.UPDATE_DATA);
      }
    });
    this.onResizeObservable = this.motifService.getEvents().pipe(filter((event) => event === MotifsServiceEvents.UPDATE_RESIZE)).subscribe(() => {
      this.updateIfInViewport(ChartEventType.RESIZE);
    });
  }

  public updateIfInViewport(type: ChartEventType): void {
    if (this.isInViewport()) {
      this.updateStream(type);
      this.isRendered = true;
    } else {
      this.isRendered = false;
    }
  }

  public updateStream(type: ChartEventType): void {
    this.stream.next({ type: type, data: this.createData() });
    this.isRendered = true;
  }

  public createData(): ISeqLogoChartDataEntry[] {
    const entries = this.cluster.entries.map((entry) => {
      return {
        pos:   entry.position,
        chars: entry.aa.map((aa) => ({ c: aa.letter, h: this.isNormalized ? aa.HNorm : aa.H })).sort((e1, e2) => e2.h - e1.h)
      };
    });

    if (this.hit !== undefined) {
      entries.push(...this.hit.split('').map((c, index) => {
        return {
          pos:   -index - 1,
          chars: [ { c: c, h: 0 } ]
        };
      }));
    }

    return entries;
  }

  public isInViewport(): boolean {
    const bounding = this.HeaderContent.nativeElement.getBoundingClientRect();
    return (
      bounding.top >= 0 &&
      bounding.left >= 0 &&
      bounding.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      bounding.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  };

  public ngOnDestroy(): void {
    this.onScrollObservable.unsubscribe();
    this.onResizeObservable.unsubscribe();
  }
}
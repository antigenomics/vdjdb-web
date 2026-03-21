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
import { IMotifCluster, IMotifClusterMeta, IMotifEpitope } from 'pages/motif/motif';
import { MotifService, MotifsServiceEvents } from 'pages/motif/motif.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector:        'motif-epitope-entry',
  templateUrl:     './motif-epitope-entry.component.html',
  styleUrls:       [ './motif-epitope-entry.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifEpitopeEntryComponent implements OnInit, OnDestroy {
  private static readonly hideScrollEventUpdateTimeout: number = 50;
  private subscription: Subscription;
  private destroy$ = new Subject<void>();

  public meta: IMotifClusterMeta;
  public isHidden: boolean = false;
  public highlightedCid: string | null = null;

  @Input('epitope')
  public epitope: IMotifEpitope;

  @Input('isNormalized')
  public isNormalized: boolean;

  @Input('allowMultiple')
  public allowMultiple: boolean = true;

  @Input('hasMultipleSelected')
  public hasMultipleSelected: boolean = false;

  @Output('onDiscard')
  public onDiscard = new EventEmitter<IMotifEpitope>();

  constructor(private motifService: MotifService, private changeDetector: ChangeDetectorRef) {}

  public ngOnInit(): void {
    this.meta = this.epitope.clusters[ 0 ].meta;
    this.subscription = this.motifService.getEvents().pipe(filter((event) => event === MotifsServiceEvents.HIDE_CLUSTERS)).subscribe(() => {
      this.isHidden = true;
      this.changeDetector.markForCheck();
    });
    this.motifService.getHighlightedCid().pipe(takeUntil(this.destroy$)).subscribe((cid) => {
      this.highlightedCid = cid;
      this.changeDetector.markForCheck();
    });
  }

  public discard(): void {
    this.onDiscard.emit(this.epitope);
  }

  public hide(): void {
    this.isHidden = !this.isHidden;
    setTimeout(() => {
      this.motifService.fireScrollUpdateEvent();
    }, MotifEpitopeEntryComponent.hideScrollEventUpdateTimeout);
  }

  public trackClusterBy(_: number, item: IMotifCluster): string {
    return item.clusterId;
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
}

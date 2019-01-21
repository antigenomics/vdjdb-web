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


import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MotifEpitope, MotifEpitopeViewOptions, MotifsMetadata, MotifsMetadataTreeLevelValue } from 'pages/motif/motif';
import { MotifService } from 'pages/motif/motif.service';
import { fromEvent, Observable, Subscription, timer } from 'rxjs';
import { debounce } from 'rxjs/operators';

@Component({
  selector:        'motif',
  templateUrl:     './motif.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MotifPageComponent implements OnInit, OnDestroy {
  private subscription: Subscription;

  public readonly metadata: Observable<MotifsMetadata>;
  public readonly selected: Observable<Array<MotifsMetadataTreeLevelValue>>;
  public readonly epitopes: Observable<Array<MotifEpitope>>;
  public readonly options: Observable<MotifEpitopeViewOptions>;

  @ViewChild('EpitopesContainer')
  public EpitopesContainer: ElementRef;

  constructor(private motifService: MotifService) {
    this.metadata = motifService.getMetadata();
    this.selected = motifService.getSelected();
    this.epitopes = motifService.getEpitopes();
    this.options = motifService.getOptions();
  }

  public ngOnInit(): void {
    // noinspection JSIgnoredPromiseFromCall
    this.motifService.load();
    this.subscription = fromEvent(this.EpitopesContainer.nativeElement, 'scroll').pipe(debounce(() => timer(5)))
      .subscribe(() => {
        this.motifService.fireScrollUpdateEvent();
      });
  }

  public isEpitopesLoading(): Observable<boolean> {
    return this.motifService.isEpitopesLoading();
  }

  public setOptions(options: MotifEpitopeViewOptions): void {
    this.motifService.setOptions(options);
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}


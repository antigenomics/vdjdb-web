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

import { ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRouteSnapshot, Data } from '@angular/router';
import { SampleService, SampleServiceEventType } from 'pages/annotations/sample/sample.service';
import { Observable, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SampleItem } from 'shared/sample/sample-item';

export class SampleRouteResolverComponent implements OnInit, OnDestroy {
  private _sampleRouteSubscription: Subscription;
  private _sampleServiceEventsSubscription: Subscription;

  public sample: SampleItem;

  constructor(protected data: Observable<Data>, protected snapshot: ActivatedRouteSnapshot,
              protected changeDetector: ChangeDetectorRef, protected sampleService: SampleService) {
    this.sample = snapshot.data.sample;
  }

  public ngOnInit(): void {
    this._sampleRouteSubscription = this.data.subscribe((data: Data) => {
      this.sample = data.sample;
      this.changeDetector.detectChanges();
    });
    this._sampleServiceEventsSubscription = this.sampleService.getEvents().pipe(filter((event) => {
      return event.type === SampleServiceEventType.EVENT_UPDATED || event.type === SampleServiceEventType.EVENT_EXPORT;
    })).subscribe(() => {
      this.changeDetector.detectChanges();
    });
  }

  public ngOnDestroy(): void {
    if (this._sampleRouteSubscription) {
      this._sampleRouteSubscription.unsubscribe();
    }
    if (this._sampleServiceEventsSubscription) {
      this._sampleServiceEventsSubscription.unsubscribe();
    }
  }
}

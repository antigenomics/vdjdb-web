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

import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, Resolve, Router, RouterStateSnapshot } from '@angular/router';
import { AnnotationsFilters } from 'pages/annotations/filters/annotations-filters';
import { SampleService } from 'pages/annotations/sample/sample.service';
import { IntersectionTable } from 'pages/annotations/sample/table/intersection/intersection-table';
import { Observable } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { SampleItem } from 'shared/sample/sample-item';
import { LoggerService } from 'utils/logger/logger.service';
import { AnnotationsService, AnnotationsServiceEvents } from '../annotations.service';

@Injectable()
export class SampleItemResolver implements Resolve<SampleItem> {
  constructor(private annotationService: AnnotationsService, private router: Router,
              private sampleService: SampleService, private logger: LoggerService) { }

  public resolve(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<SampleItem> | Promise<SampleItem> | SampleItem {
    return new Promise<SampleItem>((resolve) => {
      if (this.annotationService.isInitialized()) {
        resolve(this.getSample(route));
      } else {
        this.annotationService.getEvents().pipe(filter((event) => event === AnnotationsServiceEvents.INITIALIZED), take(1)).subscribe(() => {
          resolve(this.getSample(route));
        });
      }
    });
  }

  private getSample(route: ActivatedRouteSnapshot): SampleItem | undefined {
    const sample = this.annotationService.getSample(route.paramMap.get('sample'));
    if (sample === undefined) {
      this.router.navigate([ '/' ]);
      return undefined;
    } else {
      if (!sample.hasData()) {
        sample.setData({ table: new IntersectionTable(), filters: new AnnotationsFilters() });
      }
      this.sampleService.setCurrentSample(sample);
      this.logger.debug('SampleItemResolver: resolved', sample);
      return sample;
    }
  }
}

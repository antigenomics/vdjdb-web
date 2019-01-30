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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { TagsService } from 'pages/annotations/tags/tags.service';
import { Subscription } from 'rxjs';
import { SampleTag } from 'shared/sample/sample-tag';

@Component({
  selector:        'tags-table',
  templateUrl:     './tags-table.component.html',
  styleUrls:       [ './tags-table.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagsTableComponent implements OnInit, OnDestroy {
  private tagsServiceEventsSubscription: Subscription;

  constructor(private tagsService: TagsService, private changeDetector: ChangeDetectorRef) {}

  public ngOnInit(): void {
    this.tagsServiceEventsSubscription = this.tagsService.getEvents().subscribe(() => {
      this.changeDetector.detectChanges();
    });
  }

  public getAvailableTags(): SampleTag[] {
    return this.tagsService.getAvailableTags();
  }

  public isTagNameHelpVisible(): boolean {
    return this.tagsService.isTagNameHelpVisible();
  }

  public ngOnDestroy(): void {
    this.tagsServiceEventsSubscription.unsubscribe();
  }
}

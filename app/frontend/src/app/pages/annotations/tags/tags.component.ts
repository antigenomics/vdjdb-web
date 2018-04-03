/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AnnotationsService, AnnotationsServiceEvents } from 'pages/annotations/annotations.service';
import { TagsService } from 'pages/annotations/tags/tags.service';
import { Subscription } from 'rxjs/Subscription';

@Component({
    selector:        'tags',
    templateUrl:     './tags.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TagsComponent implements OnInit, OnDestroy {
    private _annotationsServiceEventsSubscription: Subscription;

    constructor(private annotationsService: AnnotationsService, private tagsService: TagsService, private changeDetector: ChangeDetectorRef) {
    }

    public ngOnInit(): void {
        this._annotationsServiceEventsSubscription = this.annotationsService.getEvents().subscribe((event) => {
            switch (event) {
                case AnnotationsServiceEvents.INITIALIZED:
                    this.changeDetector.detectChanges();
                    break;
                default:
            }
        });
    }

    public isInitialized(): boolean {
        return this.annotationsService.isInitialized();
    }

    public isTagsTableVisible(): boolean {
        return this.tagsService.getAvailableTags().length !== 0;
    }

    public addTag(): void {
        this.tagsService.createNewTag();
    }

    public ngOnDestroy(): void {
        this._annotationsServiceEventsSubscription.unsubscribe();
    }
}

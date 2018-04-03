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

import { Injectable } from '@angular/core';
import { SampleTag } from 'pages/annotations/tags/tag';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';

export type TagsServiceEventType = number;

export namespace TagsServiceEventType {
    export const TAG_ADDED: number = 1;
}

@Injectable()
export class TagsService {
    private events: Subject<TagsServiceEventType> = new Subject<TagsServiceEventType>();
    private tags: SampleTag[] = [];

    constructor(private logger: LoggerService, private notifications: NotificationService) {}

    public getAvailableTags(): SampleTag[] {
        return this.tags;
    }

    public getEvents(): Observable<TagsServiceEventType> {
        return this.events;
    }

    public isTagNameValid(tag: SampleTag): boolean {
        const regexp = /^[a-zA-Z0-9_.+-]{1,40}$/;
        return regexp.test(tag.name) && this.tags.filter((t) => t !== tag).findIndex((t) => t.name === tag.name) === -1;
    }

    public isTagNameHelpVisible(): boolean {
        return this.tags.reduce((previous, tag) => previous || !this.isTagNameValid(tag), false);
    }

    public createNewTag(): void {
        this.tags.push(new SampleTag());
        this.events.next(TagsServiceEventType.TAG_ADDED);
        this.logger.debug('TagsService', 'New tag added');
    }

    public save(tag: SampleTag): void {
        this.logger.debug('TagsService', `Attempt to save tag ${tag.name}`);
        if (tag.isSaved()) {
            this.logger.debug('TagsService', `Failed to save tag ${tag.name}. It is already saved`);
            this.notifications.warn('Tags', `Tag ${tag.name} already saved`);
        } else {
            const nameValid = this.isTagNameValid(tag);
            if (!nameValid) {
                this.logger.debug('TagsService', `Failed to save tag ${tag.name}. Invalid name`);
                this.notifications.error('Tags', `Tag ${tag.name} has an invalid name`);
            } else {
                // TODO add server sync
                tag.saved = true;
            }
        }
    }

    public edit(tag: SampleTag): void {
        tag.saved = false;
    }
}

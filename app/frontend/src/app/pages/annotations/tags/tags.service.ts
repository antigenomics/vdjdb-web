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
import { AnnotationsService } from 'pages/annotations/annotations.service';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { SampleTag } from 'shared/sample/sample-tag';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';

export type TagsServiceEventType = number;

export namespace TagsServiceEventType {
    export const TAG_ADDED: number = 1;
    export const TAG_SAVING_START: number = 2;
    export const TAG_SAVING_END: number = 3;
    export const TAG_DELETING_START: number = 4;
    export const TAG_DELETING_END: number = 5;
    export const TAG_UPDATING_START: number = 6;
    export const TAG_UPDATING_END: number = 7;
}

@Injectable()
export class TagsService {
    private events: Subject<TagsServiceEventType> = new Subject<TagsServiceEventType>();

    constructor(private logger: LoggerService, private annotationsService: AnnotationsService,
                private notifications: NotificationService) {}

    public getAvailableTags(): SampleTag[] {
        return this.annotationsService.getUser().tags;
    }

    public getEvents(): Observable<TagsServiceEventType> {
        return this.events;
    }

    public isTagNameValid(tag: SampleTag): boolean {
        return SampleTag.isNameValid(tag.name);
    }

    public isTagColorValid(tag: SampleTag): boolean {
        return SampleTag.isColorValid(tag.color);
    }

    public isTagNameHelpVisible(): boolean {
        return this.getAvailableTags().reduce((previous, tag) => previous || !this.isTagNameValid(tag), false);
    }

    public createNewTag(): void {
        this.getAvailableTags().push(new SampleTag(-1, '', '', false));
        this.events.next(TagsServiceEventType.TAG_ADDED);
        this.logger.debug('TagsService', 'New tag added');
    }

    public async save(tag: SampleTag): Promise<void> {
        this.logger.debug('TagsService', `Attempt to save tag`);
        this.logger.debug('TagsService', tag);
        if (tag.isSaved()) {
            this.logger.debug('TagsService', `Failed to save tag ${tag.name}. It is already saved`);
            this.notifications.warn('Tags', `Tag ${tag.name} already saved`);
        } else if (tag.isLoading()) {
            this.logger.debug('TagsService', `Failed to save tag ${tag.name}. It is already saving`);
            this.notifications.warn('Tags', `Wait until ${tag.name} will be saved`);
        } else {
            const nameValid = this.isTagNameValid(tag);
            if (!nameValid) {
                this.logger.debug('TagsService', `Failed to save tag ${tag.name}. Invalid name`);
                this.notifications.error('Tags', `Invalid tag name: ${tag.name}`);
            } else {
                const colorValid = this.isTagColorValid(tag);
                if (!colorValid) {
                    this.logger.debug('TagsService', `Failed to save tag ${tag.name}. Invalid color`);
                    this.notifications.error('Tags', `Select tag color: ${tag.name}`);
                } else {
                    tag.loading = true;
                    this.events.next(TagsServiceEventType.TAG_SAVING_START);
                    const success = await this.annotationsService.saveTag(tag);
                    if (!success) {
                        this.notifications.error('Tags', `Failed to save tag ${tag.name}`);
                    } else {
                        this.notifications.success('Tags', `Tag ${tag.name} successfully saved`);
                        tag.saved = true;
                    }
                    tag.loading = false;
                    this.events.next(TagsServiceEventType.TAG_SAVING_END);
                }
            }
        }
    }

    public async delete(tag: SampleTag): Promise<void> {
        this.logger.debug('TagsService', `Attempt to delete tag`);
        this.logger.debug('TagsService', tag);
        tag.loading = true;
        this.events.next(TagsServiceEventType.TAG_DELETING_START);
        const success = await this.annotationsService.deleteTag(tag);
        if (!success) {
            this.notifications.error('Tags', `Failed to delete tag ${tag.name}`);
        } else {
            this.notifications.success('Tags', `Tag ${tag.name} successfully deleted`);
        }
        tag.loading = false;
        this.events.next(TagsServiceEventType.TAG_DELETING_END);
    }

    public async update(tag: SampleTag): Promise<void> {
        if (!tag.isEditing()) {
            this.logger.debug('TagsService', `Failed to update tag ${tag.name}. It should be in updating state (Internal error)`);
            this.notifications.warn('Tags', `Tag ${tag.name} should be in updating state (Internal error)`);
            return;
        }
        this.logger.debug('TagsService', `Attempt to update tag`);
        this.logger.debug('TagsService', tag);
        tag.loading = true;
        this.events.next(TagsServiceEventType.TAG_UPDATING_START);
        const success = await this.annotationsService.updateTag(tag);
        if (!success) {
            this.notifications.error('Tags', `Failed to update tag ${tag.name}`);
        } else {
            this.notifications.success('Tags', `Tag ${tag.name} successfully updated`);
            tag.editing = false;
        }
        tag.loading = false;
        this.events.next(TagsServiceEventType.TAG_UPDATING_END);
    }

    public edit(tag: SampleTag): void {
        tag.editing = true;
    }
}

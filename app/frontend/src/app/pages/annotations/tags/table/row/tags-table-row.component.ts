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

import { Component, Input } from '@angular/core';
import { AnnotationsService } from 'pages/annotations/annotations.service';
import { TagsService } from 'pages/annotations/tags/tags.service';
import { SampleTag } from 'shared/sample/sample-tag';

@Component({
    selector: 'tr[tags-table-row]',
    templateUrl: './tags-table-row.component.html'
})
export class TagsTableRowComponent {
    @Input('tag')
    public tag: SampleTag;

    constructor(private tagsService: TagsService, private annotationsService: AnnotationsService) {}

    public isTagNameValid(): boolean {
        return this.tagsService.isTagNameValid(this.tag);
    }

    public pickColor(color: string): void {
        this.tag.color = color;
    }

    public save(): void {
        this.tagsService.save(this.tag);
    }

    public edit(): void {
        this.tagsService.edit(this.tag);
    }

    public update(): void {
        this.tagsService.update(this.tag);
    }

    public delete(): void {
        this.tagsService.delete(this.tag);
    }

    public getUserSamplesSetEntries(): string[] {
        return this.annotationsService.getSamples().filter((sample) => sample.tagID === -1).map((sample) => {
            return sample.name;
        });
    }

    public handleTagName(name: string): void {
        this.tag.name = name;
    }
}

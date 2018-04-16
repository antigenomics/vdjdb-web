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

import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, Renderer2, ViewChild
} from '@angular/core';
import { AnnotationsService, AnnotationsServiceEvents } from 'pages/annotations/annotations.service';
import { Subscription } from 'rxjs';
import { SampleItem } from 'shared/sample/sample-item';
import { SampleTag } from 'shared/sample/sample-tag';
import { NotificationService } from 'utils/notifications/notification.service';

export interface ISampleNewProps {
    newSoftware: string;
    newName: string;
    newTagID: number;
    sample: SampleItem;
}

@Component({
    selector:        'update-sample-modal',
    templateUrl:     'update-sample-modal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpdateSampleModalComponent implements OnInit, OnDestroy {
    private static readonly settingsTopShift: number = -35;
    private static readonly hideDelay: number = 200;
    private annotationsServiceEventsSubscription: Subscription;

    @ViewChild('modal')
    public modal: ElementRef;

    @Output('onClosed')
    public onClosed = new EventEmitter();

    public updating: boolean = false;
    public saving: boolean = false;
    public top: string;
    public sampleNewProps: ISampleNewProps;

    constructor(private annotationsService: AnnotationsService, private notifications: NotificationService,
                private renderer: Renderer2, private changeDetector: ChangeDetectorRef) {
    }

    public ngOnInit(): void {
        this.annotationsServiceEventsSubscription = this.annotationsService.getEvents().subscribe((event) => {
            if (event === AnnotationsServiceEvents.SAMPLE_TAGS_UPDATED) {
                if (this.sampleNewProps !== undefined) {
                    this.sampleNewProps.newTagID = this.sampleNewProps.sample.tagID;
                }
                this.changeDetector.detectChanges();
            }
        });
    }

    public async save(): Promise<void> {
        if (!this.isNewNameValid()) {
            this.notifications.error('Sample update', 'New sample name is not valid');
            return;
        }

        if (this.saving) {
            this.notifications.warn('Sample update', 'Wait until previous updating will be completed');
            return;
        }

        this.saving = true;
        this.changeDetector.detectChanges();

        const success = await this.annotationsService.updateSampleProps(
            this.sampleNewProps.sample, this.sampleNewProps.newName, this.sampleNewProps.newSoftware, this.sampleNewProps.newTagID
        );
        if (!success) {
            this.notifications.error('Sample update', 'An error occured during sample updating');
        } else {
            this.notifications.success('Sample update', 'Sample successfully updated');
            this.hide();
        }

        this.saving = false;
        this.changeDetector.detectChanges();
    }

    public close(): void {
        this.hide();
    }

    public update(sample: SampleItem, top: number): void {
        if (this.saving) {
            this.notifications.warn('Sample update', 'Wait until previous updating will be completed');
        } else {
            this.updating = true;
            this.sampleNewProps = { newName: sample.name, newSoftware: sample.software, newTagID: sample.tagID, sample };
            this.top = `${top + UpdateSampleModalComponent.settingsTopShift}px`;
            this.changeDetector.detectChanges();
            this.show();
        }
    }

    public isVisible(): boolean {
        return this.sampleNewProps !== undefined;
    }

    public isSampleUpdating(sample: SampleItem): boolean {
        return this.updating === true && this.sampleNewProps !== undefined && this.sampleNewProps.sample === sample;
    }

    public getSampleNewPropsTagName(): string {
        return this.sampleNewProps.newTagID < 0 ? 'No tag selected' : this.annotationsService.getSampleTagName(this.sampleNewProps.newTagID);
    }

    public getSampleNewPropsTagColor(): string {
        return this.sampleNewProps.newTagID < 0 ? 'rgba(0, 0, 0, 0)' : this.annotationsService.getSampleTagColor(this.sampleNewProps.newTagID);
    }

    public isSampleTagsAvailable(): boolean {
        return this.annotationsService.getTags().length !== 0;
    }

    public getAvailableSampleTags(): SampleTag[] {
        return this.annotationsService.getTags();
    }

    public getAvailableSoftwareTypes(): string[] {
        return this.annotationsService.getAvailableSoftwareTypes();
    }

    public isNewNameValid(): boolean {
        if (!SampleItem.isNameValid(this.sampleNewProps.newName)) {
            return false;
        }
        const duplicate = this.annotationsService.getSamples()
            .filter((s) => s !== this.sampleNewProps.sample)
            .findIndex((s) => s.name === this.sampleNewProps.newName);
        return duplicate === -1;
    }

    public setNewSoftware(software: string): void {
        this.sampleNewProps.newSoftware = software;
    }

    public setNewTagID(id: number): void {
        this.sampleNewProps.newTagID = id;
    }

    public ngOnDestroy(): void {
        this.annotationsServiceEventsSubscription.unsubscribe();
    }

    private show(): void {
        this.renderer.setStyle(this.modal.nativeElement, 'display', 'block');
        window.setImmediate(() => {
            this.renderer.setStyle(this.modal.nativeElement, 'opacity', 1.0);
        });
    }

    private hide(): void {
        this.updating = false;
        this.onClosed.emit();
        this.renderer.setStyle(this.modal.nativeElement, 'opacity', 0.0);
        window.setTimeout(() => {
            this.renderer.setStyle(this.modal.nativeElement, 'display', 'none');
            this.sampleNewProps = undefined;
            this.changeDetector.detectChanges();
        }, UpdateSampleModalComponent.hideDelay);
    }
}

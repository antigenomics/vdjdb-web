/*
 *
 *       Copyright 2017 Bagaev Dmitry
 *
 *       Licensed under the Apache License, Version 2.0 (the "License");
 *       you may not use this file except in compliance with the License.
 *       You may obtain a copy of the License at
 *
 *           http://www.apache.org/licenses/LICENSE-2.0
 *
 *       Unless required by applicable law or agreed to in writing, software
 *       distributed under the License is distributed on an "AS IS" BASIS,
 *       WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *       See the License for the specific language governing permissions and
 *       limitations under the License.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { UploadService, UploadServiceEvent } from '../upload/upload.service';
import { AnnotationsService, AnnotationsServiceEvents } from '../annotations.service';

@Component({
    selector:        'sidebar',
    templateUrl:     './sidebar.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent implements OnInit, OnDestroy {
    private _filesUploadingLabel: boolean = false;
    private _uploadServiceEventsSubscription: Subscription;
    private _annotationsServiceEventsSubscription: Subscription;

    constructor(private uploadService: UploadService, private annotationsService: AnnotationsService, private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this._uploadServiceEventsSubscription = this.uploadService.getEvents().subscribe((event) => {
            if (event === UploadServiceEvent.UPLOADING_STARTED) {
                this._filesUploadingLabel = true;
            } else if (event === UploadServiceEvent.UPLOADING_ENDED) {
                this._filesUploadingLabel = false;
            }
            this.changeDetector.detectChanges();
        });
        this._annotationsServiceEventsSubscription = this.annotationsService.getEvents().subscribe((event) => {
            switch (event) {
                case AnnotationsServiceEvents.INITIALIZED:
                    this.changeDetector.detectChanges();
                    break;
                default:
            }
        });
    }

    public isVisible(): boolean {
        return this.annotationsService.isInitialized();
    }

    public isFilesUploading(): boolean {
        return this._filesUploadingLabel;
    }

    public ngOnDestroy(): void {
        this._uploadServiceEventsSubscription.unsubscribe();
        this._annotationsServiceEventsSubscription.unsubscribe();
    }
}

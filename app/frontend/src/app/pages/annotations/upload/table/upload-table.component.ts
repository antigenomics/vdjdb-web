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

import { ChangeDetectionStrategy } from '@angular/core';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { UploadService, UploadServiceEvent } from '../upload.service';

@Component({
    selector:        'upload-table',
    templateUrl:     './upload-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadTableComponent implements OnInit, OnDestroy {
    private _stateSubscription: Subscription;

    constructor(public uploadService: UploadService, private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this._stateSubscription = this.uploadService.getEvents().subscribe((event) => {
            if (event === UploadServiceEvent.STATE_REFRESHED) {
                this.changeDetector.detectChanges();
            }
        });
    }

    public onDragDrop(event: Event): void {
        this.uploadService.addItems((event as any).dataTransfer.files);
    }

    public ngOnDestroy(): void {
        if (this._stateSubscription !== undefined) {
            this._stateSubscription.unsubscribe();
        }
    }
}

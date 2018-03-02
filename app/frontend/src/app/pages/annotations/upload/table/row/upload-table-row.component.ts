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

import {
    AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, Renderer2,
    ViewChild
} from '@angular/core';
import { FileItemStatusErrorType } from 'pages/annotations/upload/item/file-item-status';
import { Subscription } from 'rxjs/Subscription';
import { FileItem } from '../../item/file-item';
import { UploadService, UploadServiceEvent } from '../../upload.service';

@Component({
    selector:        'tr[upload-table-row]',
    templateUrl:     './upload-table-row.component.html',
    changeDetection: ChangeDetectionStrategy.Default
})
export class UploadTableRowComponent implements AfterViewInit, OnInit, OnDestroy {
    private static FULL_PROGRESS: number = 100;
    private _stateSubscription: Subscription;
    private _progressSubscription: Subscription;

    @Input('file-item')
    public item: FileItem;

    @ViewChild('progress')
    public progress: ElementRef;

    @ViewChild('progressBar')
    public progressBar: ElementRef;

    constructor(private uploadService: UploadService, private renderer: Renderer2, private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this._stateSubscription = this.uploadService.getEvents().subscribe((event) => {
            if (event === UploadServiceEvent.STATE_REFRESHED) {
                if (this.item) {
                    this.changeDetector.detectChanges();
                }
            }
        });
    }

    public ngAfterViewInit(): void {
        this.updateProgressBar(0, 0);
        this._progressSubscription = this.item.progress.subscribe((value: number) => {
            const progress = value < 0 ? UploadTableRowComponent.FULL_PROGRESS : value;
            const dataPercent = value < 0 ? 1 : value;
            this.updateProgressBar(progress, dataPercent);
        });
    }

    public upload(): void {
        this.uploadService.upload(this.item);
    }

    public remove(): void {
        this.uploadService.remove(this.item);
    }

    public compress(): void {
        this.uploadService.compress(this.item);
    }

    public isCompressAvailable(): boolean {
        return (this.item.compressed === undefined) && (this.item.getNativeFile().type === 'text/plain')
            && (this.item.status.isError()) && (this.item.status.getErrorType() === FileItemStatusErrorType.MAX_FILE_SIZE_LIMIT_EXCEEDED);
    }

    public handleName(newBaseName: string): void {
        this.uploadService.handleItemNameErrors(this.item, newBaseName);
    }

    public ngOnDestroy(): void {
        if (this._progressSubscription !== undefined) {
            this._progressSubscription.unsubscribe();
        }
        if (this._stateSubscription !== undefined) {
            this._stateSubscription.unsubscribe();
        }
    }

    private updateProgressBar(progress: number, dataPercent: number) {
        if (progress === 0) {
            this.renderer.setStyle(this.progressBar.nativeElement, 'visibility', 'hidden');
        }  else {
            this.renderer.setStyle(this.progressBar.nativeElement, 'visibility', 'visible');
        }
        this.renderer.setAttribute(this.progress.nativeElement, 'data-percent', dataPercent.toString());
        this.renderer.setStyle(this.progressBar.nativeElement, 'width', progress.toString() + '%');
        this.changeDetector.detectChanges();
    }
}

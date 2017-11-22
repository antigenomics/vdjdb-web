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

import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, Renderer2, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { FileItem } from '../../item/file-item';
import { UploadService } from '../../upload.service';

@Component({
    selector:        'tr[upload-table-row]',
    templateUrl:     './upload-table-row.component.html',
    changeDetection: ChangeDetectionStrategy.Default
})
export class UploadTableRowComponent implements AfterViewInit, OnDestroy {
    private static FULL_PROGRESS: number = 100;
    private _progressSubscription: Subscription;

    @Input('file-item')
    public item: FileItem;

    @ViewChild('progress')
    public progress: ElementRef;

    @ViewChild('progressBar')
    public progressBar: ElementRef;

    constructor(private uploadService: UploadService, private renderer: Renderer2, private changeDetector: ChangeDetectorRef) {}

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
        this.item.status.remove();
    }

    public ngOnDestroy(): void {
        if (this._progressSubscription !== undefined) {
            this._progressSubscription.unsubscribe();
            this._progressSubscription = undefined;
        }
    }

    public checkName(newBaseName: string): void {
        this.uploadService.handleItemNameErrors(this.item, newBaseName);
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

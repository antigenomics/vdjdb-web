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

import { Component, Input, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit, Renderer2, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { FileItem } from '../../item/file-item';
import { UploadService } from '../../upload.service';
import { Subscription } from 'rxjs/Subscription';

@Component({
    selector:        'tr[upload-table-row]',
    templateUrl:     './upload-table-row.component.html',
    changeDetection: ChangeDetectionStrategy.Default
})
export class UploadTableRowComponent implements AfterViewInit, OnDestroy {
    private _progressSubscription: Subscription;

    @Input('item')
    public item: FileItem;

    @ViewChild('progress')
    public progress: ElementRef;

    @ViewChild('progressBar')
    public progressBar: ElementRef;

    constructor(private renderer: Renderer2, private changeDetector: ChangeDetectorRef, private uploadService: UploadService) {}

    public ngAfterViewInit(): void {
        this.updateProgressBar(0);
        this._progressSubscription = this.item.progress.subscribe((value: number) => {
            this.updateProgressBar(value);
        });
    }

    public upload(): void {
        this.uploadService.upload(this.item);
    }

    public remove(): void {
        this.item.status.remove();
    }

    public ngOnDestroy(): void {
        this._progressSubscription.unsubscribe();
    }

    private updateProgressBar(value: number) {
        if (value === 0) {
            this.renderer.setStyle(this.progressBar.nativeElement, 'visibility', 'hidden');
        }  else {
            this.renderer.setStyle(this.progressBar.nativeElement, 'visibility', 'visible');
        }
        this.renderer.setAttribute(this.progress.nativeElement, 'data-percent', value.toString());
        this.renderer.setStyle(this.progressBar.nativeElement, 'width', value.toString() + '%');
        this.changeDetector.detectChanges();
    }
}
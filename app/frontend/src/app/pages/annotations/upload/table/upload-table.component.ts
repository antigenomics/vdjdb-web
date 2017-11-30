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

import { ChangeDetectionStrategy, ElementRef, HostBinding, HostListener, Renderer2, ViewChild } from '@angular/core';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { UploadService } from '../upload.service';

@Component({
    selector:        'upload-table',
    templateUrl:     './upload-table.component.html',
    styleUrls:       [ './upload-table.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class UploadTableComponent implements OnInit, OnDestroy {
    private _stateSubscription: Subscription;

    @ViewChild('dragArea')
    public dragArea: ElementRef;

    constructor(public uploadService: UploadService, private changeDetector: ChangeDetectorRef, private renderer: Renderer2) {
    }

    public ngOnInit(): void {
        this._stateSubscription = this.uploadService.getEvents().subscribe(() => {
            this.changeDetector.detectChanges();
        });
    }

    public showValidNameTooltip(): boolean {
        return this.uploadService.getItems().some((item) => !item.status.isNameValid());
    }

    @HostBinding('draggable')
    get getDraggable(): string {
        return 'true';
    }

    @HostListener('dragover', [ '$event' ])
    public onDragOver(event: Event) {
        this.enableDragStyle(event);
    }

    @HostListener('dragenter', [ '$event' ])
    public onDragEnter(event: Event) {
        this.enableDragStyle(event);
    }

    @HostListener('dragend', [ '$event' ])
    public onDragEnd(event: Event) {
        this.disableDragStyle(event);
    }

    @HostListener('dragleave', [ '$event' ])
    public onDragLeave(event: Event) {
        this.disableDragStyle(event);
    }

    @HostListener('drop', [ '$event' ])
    public onDrop(event: Event) {
        this.disableDragStyle(event);
        event.stopPropagation();
        this.uploadService.addItems((event as any).dataTransfer.files);
    }

    public ngOnDestroy(): void {
        if (this._stateSubscription !== undefined) {
            this._stateSubscription.unsubscribe();
        }
    }

    private enableDragStyle(event: Event): void {
        event.preventDefault();
        this.renderer.setStyle(this.dragArea.nativeElement, 'border', '1px dashed #bbb');
    }

    private disableDragStyle(event: Event): void {
        event.preventDefault();
        this.renderer.setStyle(this.dragArea.nativeElement, 'border', '1px dashed #fff');
    }
}

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

import { Injectable } from '@angular/core';
import { FileItem } from './item/file-item';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { LoggerService } from '../../../utils/logger/logger.service';
import { ReplaySubject } from 'rxjs/ReplaySubject';

export class UploadStatus {
    fileName: string;
    progress: number;
    loading: boolean;
    error: string;

    constructor(fileName: string, progress: number, loading: boolean = true, error?: string) {
        this.fileName = fileName;
        this.progress = progress;
        this.loading = loading;
        this.error = error;
    }
}

export type UploadServiceEvent = number;

export namespace UploadServiceEvent {
    export const UPLOADING_STARTED = 1;
    export const UPLOADING_ENDED = 2;
}


@Injectable()
export class UploadService {
    private _uploadingCount: number = 0;
    private _events: ReplaySubject<UploadServiceEvent> = new ReplaySubject(1);
    private _items: FileItem[] = [];

    constructor(private logger: LoggerService) {
    }

    public addItems(files: FileList): void {
        for (let i = 0; i < files.length; ++i) {
            const fileItem = new FileItem(files[ i ]);
            this.handleItemName(fileItem, fileItem.name);
            this._items.push(fileItem);
        }
    }

    public getEvents(): Observable<UploadServiceEvent> {
        return this._events;
    }

    public getItems(): FileItem[] {
        return this._items;
    }

    public isItemsEmpty(): boolean {
        return this._items.length === 0;
    }

    public isLoadingExist(): boolean {
        return this._items.some(item => item.status.isLoading());
    }

    public isReadyForUploadExist(): boolean {
        return this._items.some(item => item.status.isReadyForUpload());
    }

    public handleItemName(item: FileItem, name: string): void {
        item.status.validName();
        item.status.uniqueName();

        const regexp = /^[a-zA-Z0-9_.+-]{1,40}$/;
        const test = regexp.test(name);
        if (!test) {
            item.status.invalidName();
        }

        const isSameNameExist = this._items.some(item => item.name === name);
        if (isSameNameExist) {
            item.status.duplicaingName();
        }

        item.name = name;
    }

    public uploadAll(): void {
        this._items
            .filter(item => !item.status.beforeUploadError())
            .forEach(item => this.upload(item));
    }

    public upload(file: FileItem): void {
        if (file.status.isReadyForUpload()) {
            file.status.startLoading();

            this.fireUploadingStartEvent();
            const uploader = this.createUploader(file);
            uploader.subscribe({
                next: status => {
                    if (status.loading === false) {
                        if (status.progress === 100 && status.error === undefined) {
                            file.status.uploaded();
                        } else if (status.error !== undefined) {
                            file.status.error(status.error);
                        }
                        this.fireUploadingEndedEvent();
                    }
                    file.progress.next(status.progress);
                },
                error: (err: UploadStatus) => {
                    file.status.error(err.error);
                    file.progress.next(err.progress);
                    this.fireUploadingEndedEvent();
                }
            });

        }
    }

    private fireUploadingStartEvent(): void {
        this._uploadingCount += 1;
        this._events.next(UploadServiceEvent.UPLOADING_STARTED);
    }

    private fireUploadingEndedEvent(): void {
        this._uploadingCount -= 1;
        if (this._uploadingCount === 0) {
            this._events.next(UploadServiceEvent.UPLOADING_ENDED);
        }
    }

    private createUploader(file: FileItem): Observable<UploadStatus> {
        this.logger.debug('FileUploaderService: uploading file', `${file.name} (size: ${file.getNativeFile().size})`);

        return Observable.create((observer: Observer<UploadStatus>) => {
            const formData: FormData = new FormData();
            formData.append('file', file.getNativeFile());
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', progress => {
                if (progress.lengthComputable) {
                    const completed = Math.round(progress.loaded / progress.total * 100);
                    observer.next(new UploadStatus(file.name, completed, true));
                }
            });

            xhr.addEventListener('error', error => {
                const request = error.target as XMLHttpRequest;
                this.logger.debug('FileUploaderService: error', error);
                observer.error(new UploadStatus(file.name, 0, false, request.responseText));
            });

            xhr.addEventListener('load', event => {
                const request = event.target as XMLHttpRequest;
                const status = request.status;
                console.log(event);
                this.logger.debug('FileUploaderService: load with status', status);
                if (status === 200) {
                    observer.next(new UploadStatus(file.name, 100, false));
                    observer.complete();
                } else {
                    const errorResponse = request.responseText;
                    observer.error(new UploadStatus(file.name, 0, false, errorResponse));
                }
            });

            xhr.addEventListener('abort', () => {
                observer.error(new UploadStatus(file.name, 0, false, 'Aborted'));
            });

            xhr.open('POST', '/annotations/upload', true);
            xhr.send(formData);

            return () => xhr.abort();
        });

    }
}
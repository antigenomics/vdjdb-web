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
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { SampleItem } from '../../../shared/sample/sample-item';
import { LoggerService } from '../../../utils/logger/logger.service';
import { AnnotationsService } from '../annotations.service';
import { FileItem } from './item/file-item';

export class UploadStatus {
    public progress: number;
    public loading: boolean;
    public error: string;

    constructor(progress: number, loading: boolean = true, error?: string) {
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
    private static FULL_PROGRESS: number = 100;
    private static SUCCESS_HTTP_CODE: number = 200;

    private _uploadingCount: number = 0;
    private _events: ReplaySubject<UploadServiceEvent> = new ReplaySubject(1);
    private _items: FileItem[] = [];

    constructor(private logger: LoggerService, private annotationsService: AnnotationsService) {}

    public addItems(files: FileList): void {
        /*tslint:disable:prefer-for-of */
        for (let i = 0; i < files.length; ++i) {
            const fileItem = new FileItem(files[ i ]);
            this.handleItemName(fileItem, fileItem.baseName);
            this._items.push(fileItem);
        }
        /*tslint:enable:prefer-for-of */
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
        return this._items.some((item) => item.status.isLoading());
    }

    public isReadyForUploadExist(): boolean {
        return this._items.some((item) => item.status.isReadyForUpload());
    }

    public handleItemName(item: FileItem, baseName: string): void {
        item.status.validName();
        item.status.uniqueName();

        const regexp = /^[a-zA-Z0-9_.+-]{1,40}$/;
        const testBaseName = regexp.test(baseName);
        const testBaseNameWithExtension = regexp.test(`${baseName}.${item.extension}`);
        if (!testBaseName || !testBaseNameWithExtension) {
            item.status.invalidName();
        }

        const isSameNameExist = this._items.some((_item) => _item.baseName === baseName);
        if (isSameNameExist) {
            item.status.duplicatingName();
        }

        const isSameNameExistInUploaded = this.annotationsService.getSamples().some((_sample) => _sample.name === baseName);
        if (isSameNameExistInUploaded) {
            item.status.duplicatingName();
        }

        item.baseName = baseName;
    }

    public uploadAll(): void {
        this._items
            .filter((item) => !item.status.beforeUploadError())
            .forEach((item) => this.upload(item));
    }

    public upload(file: FileItem): void {
        if (file.status.isReadyForUpload()) {
            file.status.startLoading();

            this.fireUploadingStartEvent();
            const uploader = this.createUploader(file);
            uploader.subscribe({
                next: async (status) => {
                    if (status.loading === false) {
                        if (status.progress === UploadService.FULL_PROGRESS && status.error === undefined) {
                            const added = await this.annotationsService.addSample(file.baseName);
                            if (added) {
                                file.status.uploaded();
                            } else {
                                file.status.error('Validating failed');
                                status.progress = -1;
                            }
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

    public clearRemoved(): void {
        this._items = this._items.filter((item) => !item.status.isRemoved());
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
        this.logger.debug('FileUploaderService: uploading file', `${file.baseName} (size: ${file.getNativeFile().size})`);

        return Observable.create((observer: Observer<UploadStatus>) => {
            const formData: FormData = new FormData();
            formData.append('file', file.getNativeFile());
            formData.append('name', file.getNameWithExtension());
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (progress) => {
                if (progress.lengthComputable) {
                    const completed = Math.round(progress.loaded / progress.total * UploadService.FULL_PROGRESS);
                    observer.next(new UploadStatus(completed, true));
                }
            });

            xhr.addEventListener('error', (error) => {
                const request = error.target as XMLHttpRequest;
                this.logger.debug('FileUploaderService: error', error);
                observer.error(new UploadStatus(-1, false, request.responseText));
            });

            xhr.addEventListener('load', (event) => {
                const request = event.target as XMLHttpRequest;
                const status = request.status;
                this.logger.debug('FileUploaderService: load with status', status);
                if (status === UploadService.SUCCESS_HTTP_CODE) {
                    observer.next(new UploadStatus(UploadService.FULL_PROGRESS, false));
                    observer.complete();
                } else {
                    const errorResponse = request.responseText;
                    observer.error(new UploadStatus(-1, false, errorResponse));
                }
            });

            xhr.addEventListener('abort', () => {
                observer.error(new UploadStatus(-1, false, 'Aborted'));
            });

            xhr.open('POST', '/api/annotations/upload', true);
            xhr.send(formData);

            return () => xhr.abort();
        });

    }
}

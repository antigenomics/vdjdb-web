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
import * as gzip from 'gzip-js';
import { FileItemStatusErrorType } from 'pages/annotations/upload/item/file-item-status';
import { Observable, Observer } from 'rxjs';
import { SampleItem } from 'shared/sample/sample-item';
import { SampleTag } from 'shared/sample/sample-tag';
import { AnalyticsService } from 'utils/analytics/analytics.service';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';
import { AnnotationsService, AnnotationsServiceEvents } from '../annotations.service';
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

@Injectable()
export class UploadService {
    private static readonly FILE_UPLOAD_GOAL: string = 'file-upload-goal';
    private static readonly FULL_PROGRESS: number = 100;
    private static readonly SUCCESS_HTTP_CODE: number = 200;

    private _uploadingCount: number = 0;
    private _files: FileItem[] = [];

    constructor(private logger: LoggerService, private annotationsService: AnnotationsService,
                private notifications: NotificationService, private analytics: AnalyticsService) {
        this.annotationsService.getEvents().subscribe((event: AnnotationsServiceEvents) => {
            switch (event) {
                case AnnotationsServiceEvents.SAMPLE_DELETED:
                    this.updateErrors();
                    break;
                default:
            }
        });
    }

    public addItems(files: FileList): void {
        /*tslint:disable:prefer-for-of */
        for (let i = 0; i < files.length; ++i) {
            const file = new FileItem(files[ i ]);
            this._files.push(file);
        }
        this.updateErrors();
        /*tslint:enable:prefer-for-of */
    }

    public getAvailableSoftwareTypes(): string[] {
        return this.annotationsService.getAvailableSoftwareTypes();
    }

    public getEvents(): Observable<AnnotationsServiceEvents> {
        return this.annotationsService.getEvents();
    }

    public getItems(): FileItem[] {
        return this._files;
    }

    public isItemsEmpty(): boolean {
        return this._files.length === 0;
    }

    public isLoadingExist(): boolean {
        return this._files.some((item) => item.status.isLoading());
    }

    public isReadyForUploadExist(): boolean {
        return this._files.some((item) => item.status.isReadyForUpload());
    }

    public checkTagsAvailability(): void {
        this._files.forEach((file) => {
            if (file.tag !== undefined) {
                const index = this.annotationsService.getTags().indexOf(file.tag);
                if (index === -1) {
                    file.tag = undefined;
                }
            }
        });
    }

    public handleItemNameErrors(item: FileItem, baseName: string, from?: FileItem[]): boolean {
        item.status.setValidNameStatus();
        item.status.setUniqueNameStatus();

        let error = false;
        const testBaseName = SampleItem.isNameValid(baseName);
        const testBaseNameWithExtension = SampleItem.isNameValid(`${baseName}.${item.extension}`);
        if (!testBaseName || !testBaseNameWithExtension) {
            item.status.setInvalidNameStatus();
            error = true;
        }

        const items = from ? from : this._files;
        const isSameNameExist = items
            .filter((f) => !(f.status.isRemoved() || f.status.isError()))
            .some((f) => f.baseName === baseName);
        if (isSameNameExist) {
            item.status.setDuplicateNameStatus();
            error = true;
        }

        const userSamples = this.annotationsService.getSamples();
        const isSameNameExistInUploaded = userSamples.some((sample) => sample.name === baseName);
        if (isSameNameExistInUploaded) {
            item.status.setDuplicateNameStatus();
            error = true;
        }

        item.baseName = baseName;
        return error;
    }

    public handlePermissionsErrors(item: FileItem): boolean {
        const permissions = this.annotationsService.getUserPermissions();
        if (!permissions.isUploadAllowed) {
            item.setErrorStatus('Uploading is not allowed for this account', FileItemStatusErrorType.UPLOAD_NOT_ALLOWED);
            return true;
        }
        if (permissions.maxFilesCount >= 0) {
            const waitingFilesLength = this._files.filter((_item) => _item.status.isWaiting()).length;
            const sampleFilesLength = this.annotationsService.getSamples().length;
            if ((waitingFilesLength + sampleFilesLength) > permissions.maxFilesCount) {
                item.setErrorStatus('Max files count limit have been exceeded', FileItemStatusErrorType.MAX_FILES_COUNT_LIMIT_EXCEEDED);
                return true;
            }
        }
        if (permissions.maxFileSize >= 0) {
            if (item.compressed && item.compressed.size < permissions.getMaxFileSizeInBytes()) {
                return false;
            } else if (item.getNativeFile().size >= permissions.getMaxFileSizeInBytes()) {
                item.setErrorStatus('Max file size limit have been exceeded', FileItemStatusErrorType.MAX_FILE_SIZE_LIMIT_EXCEEDED);
                return true;
            }
        }
        return false;
    }

    // noinspection JSMethodCanBeStatic
    public handleExtensionErrors(item: FileItem): boolean {
        if (FileItem.AVAILABLE_EXTENSIONS.indexOf(item.extension) === -1) {
            item.setErrorStatus('Invalid file extension', FileItemStatusErrorType.INVALID_FILE_EXTENSION);
            return true;
        }
        return false;
    }

    public updateErrors(): void {
        const checked: FileItem[] = [];
        const items = this._files.filter((item) => !(item.status.isRemoved() || item.status.isUploaded()));
        for (const item of items) {
            item.clearErrors();
            const extensionErrors = this.handleExtensionErrors(item);
            if (!extensionErrors) {
                const permissionErrors = this.handlePermissionsErrors(item);
                if (!permissionErrors) {
                    this.handleItemNameErrors(item, item.baseName, checked);
                }
            }
            checked.push(item);
        }
        this.annotationsService.fireEvent(AnnotationsServiceEvents.UPLOAD_SERVICE_STATE_REFRESHED);
    }

    public compress(item: FileItem): void {
        item.status.setCompressingStatus();
        const reader = new FileReader();
        reader.onload = (event: Event) => {
            const array = new Uint8Array((event.target as any).result);
            const gzippedByteArray = new Uint8Array(gzip.zip(array));
            const gzippedBlob = new Blob([ gzippedByteArray ], { type: 'application/x-gzip' });
            item.compressed = gzippedBlob;
            item.setExtension('gz');
            this.updateErrors();
        };
        reader.readAsArrayBuffer(item.getNativeFile());
    }

    public remove(item: FileItem): void {
        item.status.setRemovedStatus();
        this.updateErrors();
    }

    public uploadAll(): void {
        this._files
            .filter((item) => !item.status.beforeUploadError())
            .forEach((item) => this.upload(item));
    }

    public upload(file: FileItem): void {
        if (!this.annotationsService.getUserPermissions().isUploadAllowed) {
            this.notifications.error('Upload', 'Uploading is not allowed for this account');
            return;
        }

        this.analytics.reachGoal(UploadService.FILE_UPLOAD_GOAL, file.getFileItemStats());

        if (file.status.isReadyForUpload()) {
            file.status.setLoadingStatus();

            this.fireUploadingStartEvent();
            const uploader = this.createUploader(file);
            uploader.subscribe({
                next:  async (status: UploadStatus) => {
                    if (status.loading === false) {
                        if (status.progress === UploadService.FULL_PROGRESS && status.error === undefined) {
                            const added = await this.annotationsService.addSample(file);
                            if (added) {
                                file.setUploadedStatus();
                            } else {
                                file.setErrorStatus('Validating failed', FileItemStatusErrorType.VALIDATION_FAILED);
                            }
                        } else if (status.error !== undefined) {
                            file.setErrorStatus(status.error, FileItemStatusErrorType.INTERNAL_ERROR);
                        }
                        this.fireUploadingEndedEvent();
                    } else {
                        file.progress.next(status.progress);
                    }
                },
                error: (err: UploadStatus) => {
                    file.setErrorStatus(err.error, FileItemStatusErrorType.INTERNAL_ERROR);
                    this.fireUploadingEndedEvent();
                }
            });

        }
    }

    public isUploadedExist(): boolean {
        return this._files.some((item) => item.status.isUploaded());
    }

    public clearUploaded(): void {
        this._files = this._files.filter((item) => !item.status.isUploaded());
        this.annotationsService.fireEvent(AnnotationsServiceEvents.UPLOAD_SERVICE_STATE_REFRESHED);
    }

    public isRemovedExist(): boolean {
        return this._files.some((item) => item.status.isRemoved());
    }

    public clearRemoved(): void {
        this._files = this._files.filter((item) => !item.status.isRemoved());
        this.annotationsService.fireEvent(AnnotationsServiceEvents.UPLOAD_SERVICE_STATE_REFRESHED);
    }

    public isErroredExist(): boolean {
        return this._files.some((item) => item.status.isError());
    }

    public clearErrored(): void {
        this._files = this._files.filter((item) => !item.status.isError());
        this.annotationsService.fireEvent(AnnotationsServiceEvents.UPLOAD_SERVICE_STATE_REFRESHED);
    }

    public setDefaultSoftware(software: string): void {
        this._files
            .filter((item) => !(item.status.isError() || item.status.isRemoved() || item.status.isUploaded()))
            .forEach((item) => item.setSoftware(software));
    }

    public setDefaultTag(tag: SampleTag): void {
        this._files
            .filter((item) => !(item.status.isError() || item.status.isRemoved() || item.status.isUploaded()))
            .forEach((item) => item.setTag(tag));
    }

    private fireUploadingStartEvent(): void {
        this._uploadingCount += 1;
        this.annotationsService.fireEvent(AnnotationsServiceEvents.UPLOAD_SERVICE_UPLOAD_STARTED);
    }

    private fireUploadingEndedEvent(): void {
        this._uploadingCount -= 1;
        if (this._uploadingCount === 0) {
            this.annotationsService.fireEvent(AnnotationsServiceEvents.UPLOAD_SERVICE_UPLOAD_ENDED);
        }
    }

    private createUploader(file: FileItem): Observable<UploadStatus> {
        this.logger.debug('FileUploaderService: uploading file', `${file.baseName} (size: ${file.getNativeFile().size})`);

        return Observable.create((observer: Observer<UploadStatus>) => {
            const formData: FormData = new FormData();
            formData.append('file', file.getUploadBlob());
            formData.append('name', file.getUploadBlobName());
            formData.append('software', file.software);
            const xhr = new XMLHttpRequest();

            const progressEventListener = (progress: ProgressEvent) => {
                if (progress.lengthComputable) {
                    const completed = Math.round(progress.loaded / progress.total * UploadService.FULL_PROGRESS);
                    observer.next(new UploadStatus(completed, true));
                }
            };
            xhr.upload.addEventListener('progress', progressEventListener);

            const errorEventListener: EventListener = (error: Event) => {
                const request = error.target as XMLHttpRequest;
                this.logger.debug('FileUploaderService: error', error);
                observer.error(new UploadStatus(-1, false, request.responseText));
            };
            xhr.addEventListener('error', errorEventListener);
            xhr.upload.addEventListener('error', errorEventListener);

            const loadEventListener = (event: Event) => {
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
            };
            xhr.addEventListener('load', loadEventListener);

            const abortEventListener = () => {
                observer.error(new UploadStatus(-1, false, 'Aborted'));
            };
            xhr.addEventListener('abort', abortEventListener);
            xhr.upload.addEventListener('abort', abortEventListener);

            const timeoutEventListener = () => {
                observer.error(new UploadStatus(-1, false, 'Timeout'));
            };
            xhr.addEventListener('timeout', timeoutEventListener);
            xhr.upload.addEventListener('timeout', timeoutEventListener);

            xhr.open('POST', '/api/annotations/upload', true);
            xhr.send(formData);

            return () => xhr.abort();
        });

    }
}

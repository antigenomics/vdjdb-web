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
import { Observable } from 'rxjs/Observable'
import { Observer } from 'rxjs/Observer'
import { LoggerService } from '../../../utils/logger/logger.service';

export class UploadStatus {
    fileName: string;
    progress: number;

    constructor(fileName: string, progress: number) {
        this.fileName = fileName;
        this.progress = progress;
    }
}


@Injectable()
export class UploadService {
    private _items: FileItem[] = [];

    constructor(private logger: LoggerService) {}

    public addItems(files: FileList): void {
        for (let i = 0; i < files.length; ++i) {
            this._items.push(new FileItem(files.item(i)))
        }
    }

    public getItems(): FileItem[] {
        return this._items;
    }

    public isItemsEmpty(): boolean {
        return this._items.length === 0;
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
            .filter(item => !item.status.isError())
            .forEach(item => this.upload(item));
    }

    public upload(file: FileItem): void {
        if (file.status.isReadyForUpload()) {
            file.status.startLoading();
            const uploader = this.createUploader(file);
            uploader.subscribe(status => {
                if (status.progress === 100) {
                    file.status.uploaded();
                }
                file.progress.next(status.progress);
                this.logger.debug('Upload: ', status);
            })
        }
    }

    private createUploader(file: FileItem): Observable<UploadStatus> {
        this.logger.debug('FileUploaderService: uploading file', file);

        let formData: FormData = new FormData();
        formData.append('file', file.getNativeFile());

        return Observable.create((observer: Observer<UploadStatus>) => {
            const xhr = new XMLHttpRequest();

            xhr.addEventListener('progress', progress => {
                this.logger.debug('FileUploaderService: progress', progress);
                if (progress.lengthComputable) {
                    // progress.loaded is a number between 0 and 1, so we'll multiple it by 100
                    const completed = Math.round(progress.loaded / progress.total * 100);
                    observer.next(new UploadStatus(file.name, completed));
                }
            });

            xhr.addEventListener('error', error => {
                this.logger.debug('FileUploaderService: error', error);
            });

            xhr.open('POST', '/annotations/upload');
            xhr.send(formData);

            return () => xhr.abort();
        })

    }
}
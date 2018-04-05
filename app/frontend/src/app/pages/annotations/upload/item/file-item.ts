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

import { ReplaySubject } from 'rxjs/ReplaySubject';
import { SampleTag } from 'shared/sample/sample-tag';
import { Utils } from 'utils/utils';
import { FileItemStatus, FileItemStatusErrorType } from './file-item-status';

export class FileItem {
    public static FULL_PROGRESS: number = 100;
    public static AVAILABLE_EXTENSIONS: string[] = [ 'txt', 'gz', 'zip' ];

    public compressed?: Blob;
    public native: File;
    public baseName: string = '';
    public extension: string = '';
    public software: string = 'VDJtools';
    public tag?: SampleTag;
    public progress: ReplaySubject<number> = new ReplaySubject(1);
    public status: FileItemStatus = new FileItemStatus();

    constructor(file: File) {
        this.native = file;
        this.baseName = Utils.File.baseName(file.name);
        this.extension = Utils.File.extension(file.name);

        let nextExt = Utils.File.extension(this.baseName);
        while (FileItem.AVAILABLE_EXTENSIONS.indexOf(nextExt) !== -1) {
            this.baseName = Utils.File.baseName(this.baseName);
            nextExt = Utils.File.extension(this.baseName);
        }
    }

    public setUploadedStatus(): void {
        this.status.setUploadedStatus();
        this.progress.next(FileItem.FULL_PROGRESS);
    }

    public setErrorStatus(error: string, type: FileItemStatusErrorType): void {
        this.status.setErrorStatus(error, type);
        this.progress.next(-1);
    }

    public clearErrors(): void {
        this.status.clearErrors();
        this.progress.next(0);
    }

    public setSoftware(software: string): void {
        this.software = software;
    }

    public setTag(tag: SampleTag): void {
        this.tag = tag;
    }

    public setExtension(extension: string): void {
        this.extension = extension;
    }

    public getNativeFile(): File {
        return this.native;
    }

    public getUploadBlob(): Blob {
        return this.compressed !== undefined ? this.compressed : this.getNativeFile();
    }

    public getUploadBlobName(): string {
        return `${this.baseName}.${this.extension}`;
    }
}

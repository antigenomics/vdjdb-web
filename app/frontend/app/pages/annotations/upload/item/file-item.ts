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
import { FileItemSoftware, FileItemSoftwareTypes } from './file-item-software';
import { FileItemStatus } from './file-item-status';
import { Utils } from '../../../../utils/utils';
import baseName = Utils.File.baseName;

export class FileItem {
    private static FULL_PROGRESS: number = 100;

    public native: File;

    public baseName: string = '';
    public extension: string = '';
    public software: FileItemSoftware = FileItemSoftwareTypes.VDJTOOLS;
    public progress: ReplaySubject<number> = new ReplaySubject(1);
    public status: FileItemStatus = new FileItemStatus();

    constructor(file: File) {
        this.native = file;
        this.baseName = Utils.File.baseName(file.name);
        this.extension = Utils.File.extension(file.name);
    }

    public uploaded(): void {
        this.status.uploaded();
        this.progress.next(FileItem.FULL_PROGRESS);
    }

    public setError(error: string): void {
        this.status.error(error);
        this.progress.next(-1);
    }

    public clearErrors(): void {
        this.status.clearErrors();
        this.progress.next(0);
    }

    public setSoftware(software: FileItemSoftware): void {
        this.software = software;
    }

    public getNativeFile(): File {
        return this.native;
    }

    public getNameWithExtension(): string {
        return `${this.baseName}.${this.extension}`;
    }

    // noinspection JSMethodCanBeStatic
    public getAvailableSoftwareTypes(): FileItemSoftware[] {
        return [ FileItemSoftwareTypes.VDJTOOLS ];
    }
}

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

import { Subject } from 'rxjs/Subject';

export type FileItemSoftwareType = string;

export namespace FileItemSoftwareType {
    export const VDJTOOLS: string = 'VDJtools';
}

export type FileItemStatus = string;

export namespace FileItemStatus {
    export const WAITING: string = 'In queue';
    export const LOADING: string = 'Loading';
    export const UPLOADED: string = 'Uploaded';
}

export class FileItem {
    public native: File;

    public name: string = '';
    public software: FileItemSoftwareType = FileItemSoftwareType.VDJTOOLS;
    public progress: Subject<number> = new Subject();
    public status: FileItemStatus = FileItemStatus.WAITING;

    constructor(file: File) {
        this.native = file;
        this.name = file.name;
    }

    public setSoftware(software: FileItemSoftwareType): void {
        this.software = software;
    }

    public getNativeFile(): File {
        return this.native;
    }

    public isNameValid(): boolean {
        let regexp = /^[a-zA-Z0-9_.+-]{1,40}$/;
        return regexp.test(this.name);
    }

    public isWaiting(): boolean {
        return this.status === FileItemStatus.WAITING;
    }

    // noinspection JSMethodCanBeStatic
    public getAvailableSoftwareTypes(): string[] {
        return [ FileItemSoftwareType.VDJTOOLS ];
    }
}
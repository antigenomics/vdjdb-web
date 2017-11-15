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
    export const IN_QUEUE: string = 'In queue';
    export const LOADING: string = 'Loading';
    export const UPLOADED: string = 'Uploaded';
}

export class FileItem {
    private _file: File;

    public name: string = '';
    public software: FileItemSoftwareType = FileItemSoftwareType.VDJTOOLS;
    public progress: Subject<number> = new Subject();
    public status: FileItemStatus = FileItemStatus.IN_QUEUE;

    constructor(file: File) {
        this._file = file;
        this.name = file.name;
    }

    public getNativeFile(): File {
        return this._file;
    }

    public isNameValid(): boolean {
        let regexp = /^[a-zA-Z0-9_.+-]{1,40}$/;
        return regexp.test(this.name);
    }
}
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
import { FileItemStatus } from './file-item-status';
import { FileItemSoftware, FileItemSoftwareTypes } from './file-item-software';

export class FileItem {
    public native: File;

    public name: string = '';
    public software: FileItemSoftware = FileItemSoftwareTypes.VDJTOOLS;
    public progress: ReplaySubject<number> = new ReplaySubject(1);
    public status: FileItemStatus = new FileItemStatus();

    constructor(file: File) {
        this.native = file;
        this.name = file.name;
    }

    public setSoftware(software: FileItemSoftware): void {
        this.software = software;
    }

    public getNativeFile(): File {
        return this.native;
    }

    // noinspection JSMethodCanBeStatic
    public getAvailableSoftwareTypes(): FileItemSoftware[] {
        return [ FileItemSoftwareTypes.VDJTOOLS ];
    }
}
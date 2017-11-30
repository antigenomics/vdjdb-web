/*
 *        Copyright 2017 Bagaev Dmitry
 *
 *        Licensed under the Apache License, Version 2.0 (the "License");
 *        you may not use this file except in compliance with the License.
 *        You may obtain a copy of the License at
 *
 *            http://www.apache.org/licenses/LICENSE-2.0
 *
 *        Unless required by applicable law or agreed to in writing, software
 *        distributed under the License is distributed on an "AS IS" BASIS,
 *        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *        See the License for the specific language governing permissions and
 *        limitations under the License.
 *
 */

export type FileItemStatusFlags = number;

export namespace FileItemStatusFlags {
    /*tslint:disable:no-bitwise no-magic-numbers */
    export const WAITING: number = 1 << 0;
    export const REMOVED: number = 1 << 1;
    export const INVALID_FILE_NAME: number = 1 << 2;
    export const DUPLICATE_FILE_NAME: number = 1 << 3;
    export const LOADING: number = 1 << 4;
    export const UPLOADED: number = 1 << 5;
    export const ERROR: number = 1 << 6;
    /*tslint:enable:no-bitwise no-magic-numbers*/
}

export class FileItemStatus {
    private _flags: FileItemStatusFlags = FileItemStatusFlags.WAITING;
    private _errorStatus: string = '';

    public isWaiting(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.WAITING);
    }

    public isRemoved(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.REMOVED);
    }

    public isNameValidOrDuplicate(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.INVALID_FILE_NAME) === false
            && this.checkStatusFlag(FileItemStatusFlags.DUPLICATE_FILE_NAME) === false;
    }

    public isNameValid(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.INVALID_FILE_NAME) === false;
    }

    public isDuplicate(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.DUPLICATE_FILE_NAME);
    }

    public isLoading(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.LOADING);
    }

    public isUploaded(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.UPLOADED);
    }

    public isError(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.ERROR);
    }

    public isReadyForUpload(): boolean {
        return this.beforeUploadError() === false && this.checkStatusFlag(FileItemStatusFlags.WAITING);
    }

    public beforeUploadError(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.INVALID_FILE_NAME) === true
            || this.checkStatusFlag(FileItemStatusFlags.DUPLICATE_FILE_NAME) === true;
    }

    public setLoadingStatus(): void {
        this.setSingleStatusFlag(FileItemStatusFlags.LOADING);
    }

    public setUploadedStatus(): void {
        this.setSingleStatusFlag(FileItemStatusFlags.UPLOADED);
    }

    public setErrorStatus(errorStatus: string): void {
        this.setSingleStatusFlag(FileItemStatusFlags.ERROR);
        this._errorStatus = errorStatus;
    }

    public setInvalidNameStatus(): void {
        this.setStatusFlag(FileItemStatusFlags.INVALID_FILE_NAME);
    }

    public setValidNameStatus(): void {
        this.unsetStatusFlag(FileItemStatusFlags.INVALID_FILE_NAME);
    }

    public setDuplicateNameStatus(): void {
        this.setStatusFlag(FileItemStatusFlags.DUPLICATE_FILE_NAME);
    }

    public setUniqueNameStatus(): void {
        this.unsetStatusFlag(FileItemStatusFlags.DUPLICATE_FILE_NAME);
    }

    public setRemovedStatus(): void {
        this.setSingleStatusFlag(FileItemStatusFlags.REMOVED);
    }

    public clearErrors(): void {
        this.unsetStatusFlag(FileItemStatusFlags.ERROR);
        this.setStatusFlag(FileItemStatusFlags.WAITING);
        this._errorStatus = '';
    }

    public getLabelStatusClass(): string {
        if (this.isRemoved()) {
            return 'removed';
        } else if (this.isError()) {
            return 'error';
        } else if (this.isWaiting() || !this.isNameValidOrDuplicate()) {
            return 'warning';
        } else {
            return 'success';
        }
    }

    public getStatusString(): string {
        if (this.checkStatusFlag(FileItemStatusFlags.REMOVED)) {
            return 'Removed';
        } else if (this.checkStatusFlag(FileItemStatusFlags.INVALID_FILE_NAME)) {
            return 'Invalid sample name';
        } else if (this.checkStatusFlag(FileItemStatusFlags.DUPLICATE_FILE_NAME)) {
            return 'Duplicating sample name';
        } else if (this.checkStatusFlag(FileItemStatusFlags.WAITING)) {
            return 'In queue';
        } else if (this.checkStatusFlag(FileItemStatusFlags.LOADING)) {
            return 'Loading';
        } else if (this.checkStatusFlag(FileItemStatusFlags.UPLOADED)) {
            return 'Uploaded successfully';
        } else if (this.checkStatusFlag(FileItemStatusFlags.ERROR)) {
            return this._errorStatus;
        }
        return '';
    }

    /*tslint:disable:no-bitwise */
    private checkStatusFlag(flag: FileItemStatusFlags): boolean {
        return (this._flags & flag) === flag;
    }

    private setStatusFlag(flag: FileItemStatusFlags): void {
        this._flags |= flag;
    }

    private setSingleStatusFlag(flag: FileItemStatusFlags): void {
        this._flags = flag;
    }

    private unsetStatusFlag(flag: FileItemStatusFlags): void {
        this._flags &= (~flag);
    }
    /*tslint:enable:no-bitwise */
}

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
    private _errorStatus: string = '';

    public status: FileItemStatusFlags = FileItemStatusFlags.WAITING;

    public isWaiting(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.WAITING);
    }

    public isRemoved(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.REMOVED);
    }

    public beforeUploadError(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.INVALID_FILE_NAME) === true
            || this.checkStatusFlag(FileItemStatusFlags.DUPLICATE_FILE_NAME) === true;
    }

    public isLoading(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.LOADING);
    }

    public isError(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.ERROR);
    }

    public isReadyForUpload(): boolean {
        return this.beforeUploadError() === false && this.checkStatusFlag(FileItemStatusFlags.WAITING);
    }

    public isUploaded(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.UPLOADED);
    }

    public isNameValid(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.INVALID_FILE_NAME) === false
            && this.checkStatusFlag(FileItemStatusFlags.DUPLICATE_FILE_NAME) === false;
    }

    public isDuplicate(): boolean {
        return this.checkStatusFlag(FileItemStatusFlags.DUPLICATE_FILE_NAME);
    }

    public startLoading(): void {
        this.unsetStatusFlag(FileItemStatusFlags.WAITING);
        this.setStatusFlag(FileItemStatusFlags.LOADING);
    }

    public uploaded(): void {
        this.unsetStatusFlag(FileItemStatusFlags.LOADING);
        this.setStatusFlag(FileItemStatusFlags.UPLOADED);
    }

    public error(errorStatus: string): void {
        this.unsetStatusFlag(FileItemStatusFlags.WAITING);
        this.unsetStatusFlag(FileItemStatusFlags.LOADING);
        this.setStatusFlag(FileItemStatusFlags.ERROR);
        this._errorStatus = errorStatus;
    }

    public invalidName(): void {
        this.setStatusFlag(FileItemStatusFlags.INVALID_FILE_NAME);
    }

    public validName(): void {
        this.unsetStatusFlag(FileItemStatusFlags.INVALID_FILE_NAME);
    }

    public duplicatingName(): void {
        this.setStatusFlag(FileItemStatusFlags.DUPLICATE_FILE_NAME);
    }

    public uniqueName(): void {
        this.unsetStatusFlag(FileItemStatusFlags.DUPLICATE_FILE_NAME);
    }

    public remove(): void {
        this.unsetStatusFlag(FileItemStatusFlags.WAITING);
        this.setStatusFlag(FileItemStatusFlags.REMOVED);
    }

    public clearErrors(): void {
        this.unsetStatusFlag(FileItemStatusFlags.ERROR);
        this._errorStatus = '';
        this.setStatusFlag(FileItemStatusFlags.WAITING);
    }

    public getLabelStatusClass(): string {
        if (this.isError()) {
            return 'error';
        } else if (this.isWaiting() || !this.isNameValid()) {
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
        return (this.status & flag) === flag;
    }

    private setStatusFlag(flag: FileItemStatusFlags): void {
        this.status |= flag;
    }

    private unsetStatusFlag(flag: FileItemStatusFlags): void {
        this.status &= (~flag);
    }
    /*tslint:enable:no-bitwise */
}

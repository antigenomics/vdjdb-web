/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

export type FileItemStatusErrorType = number;

export namespace FileItemStatusErrorType {
  export const NO_ERROR: number = 0;
  export const UPLOAD_NOT_ALLOWED: number = 1;
  export const MAX_FILES_COUNT_LIMIT_EXCEEDED: number = 1;
  export const MAX_FILE_SIZE_LIMIT_EXCEEDED: number = 2;
  export const INVALID_FILE_EXTENSION: number = 3;
  export const VALIDATION_FAILED: number = 4;
  export const INTERNAL_ERROR: number = 5;
}

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
  export const COMPRESSING: number = 1 << 7;
  /*tslint:enable:no-bitwise no-magic-numbers*/
}

export class FileItemStatus {
  private _flags: FileItemStatusFlags = FileItemStatusFlags.WAITING;
  private _errorStatus: string = '';
  private _errorType: FileItemStatusErrorType = FileItemStatusErrorType.NO_ERROR;

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

  public isCompressing(): boolean {
    return this.checkStatusFlag(FileItemStatusFlags.COMPRESSING);
  }

  public isError(): boolean {
    return this.checkStatusFlag(FileItemStatusFlags.ERROR);
  }

  public getErrorType(): FileItemStatusErrorType {
    return this._errorType;
  }

  public isReadyForUpload(): boolean {
    return this.beforeUploadError() === false && this.checkStatusFlag(FileItemStatusFlags.WAITING);
  }

  public beforeUploadError(): boolean {
    return this.checkStatusFlag(FileItemStatusFlags.INVALID_FILE_NAME) === true
      || this.checkStatusFlag(FileItemStatusFlags.DUPLICATE_FILE_NAME) === true;
  }

  public setWaitingStatus(): void {
    this.setSingleStatusFlag(FileItemStatusFlags.WAITING);
  }

  public setCompressingStatus(): void {
    this.setSingleStatusFlag(FileItemStatusFlags.COMPRESSING);
  }

  public setLoadingStatus(): void {
    this.setSingleStatusFlag(FileItemStatusFlags.LOADING);
  }

  public setUploadedStatus(): void {
    this.setSingleStatusFlag(FileItemStatusFlags.UPLOADED);
  }

  public setErrorStatus(errorStatus: string, errorType: FileItemStatusErrorType): void {
    this.setSingleStatusFlag(FileItemStatusFlags.ERROR);
    this._errorStatus = errorStatus;
    this._errorType = errorType;
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
    this._errorType = FileItemStatusErrorType.NO_ERROR;
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
    } else if (this.checkStatusFlag(FileItemStatusFlags.COMPRESSING)) {
      return 'Compressing';
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

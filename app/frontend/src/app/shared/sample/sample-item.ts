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

import { AnnotationsFilters } from 'pages/annotations/filters/annotations-filters';
import { IntersectionTable } from 'pages/annotations/sample/table/intersection/intersection-table';

export interface ISampleItemData {
  readonly filters: AnnotationsFilters;
  readonly table: IntersectionTable;
}

export class SampleItem {
  private static readonly nameRegexp = /^[a-zA-Z0-9_.+-]{1,40}$/;

  private _data: ISampleItemData;
  private _processingLabel: string = '';
  private _processing: boolean = false;

  public name: string;
  public software: string;
  public readsCount: number;
  public clonotypesCount: number;
  public tagID: number;

  constructor(name: string, software: string, readsCount: number, clonotypesCount: number, tagID: number) {
    this.name = name;
    this.software = software;
    this.readsCount = readsCount;
    this.clonotypesCount = clonotypesCount;
    this.tagID = tagID;
  }

  public updateProps(newName: string, newSoftware: string, newTagID: number): void {
    this.name = newName;
    this.software = newSoftware;
    this.tagID = newTagID;
  }

  public setData(data: ISampleItemData): void {
    this._data = data;
  }

  public hasTag(): boolean {
    return this.tagID !== -1;
  }

  public hasData(): boolean {
    return this._data !== undefined;
  }

  public getData(): ISampleItemData {
    return this._data;
  }

  public get table(): IntersectionTable {
    return this._data.table;
  }

  public get filters(): AnnotationsFilters {
    return this._data.filters;
  }

  public setProcessingLabel(processingLabel: string): void {
    this._processingLabel = processingLabel;
  }

  public getProcessingLabel(): string {
    return this._processingLabel;
  }

  public setProcessingStatus(processing: boolean): void {
    this._processing = processing;
  }

  public isProcessing(): boolean {
    return this._processing;
  }

  public isSampleInfoExist(): boolean {
    return this.readsCount !== -1 && this.clonotypesCount !== -1;
  }

  public static isNameValid(name: string): boolean {
    return SampleItem.nameRegexp.test(name);
  }

  public static deserialize(o: any): SampleItem {
    return new SampleItem(o[ 'name' ], o[ 'software' ], o[ 'readsCount' ], o[ 'clonotypesCount' ], o[ 'tagID' ]); // tslint:disable-line:no-string-literal
  }
}

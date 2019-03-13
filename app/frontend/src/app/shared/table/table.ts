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

import { Subject } from 'rxjs';
import { TableRow } from './row/table-row';

export type TableEvent = number;

export namespace TableEvent {
  export const LOADING: number = 0;
  export const INITIALIZED: number = 1;
  export const UPDATED: number = 2;
}

export class TableSortRule {
  public column: string = '';
  public type: 'asc' | 'desc' | 'none' = 'none';

  public update(column: string): void {
    if (this.column === column) {
      this.type = (this.type === 'desc') ? 'asc' : 'desc';
    } else {
      this.column = column;
      this.type = 'desc';
    }
  }

  public clear(): void {
    this.column = '';
    this.type = 'none';
  }

  public toString(): string {
    return `${this.column}:${this.type}`;
  }
}

export abstract class Table<R extends TableRow> {
  private static readonly _initialPage: number = 0;
  private static readonly _initialPageSize: number = 25;

  private _events: Subject<TableEvent> = new Subject();

  private _exporting: boolean = false;
  private _loading: boolean = false;
  private _dirty: boolean = false;
  private _error: boolean = false;
  private _empty: boolean = true;
  private _page: number = Table._initialPage;
  private _pageSize: number = Table._initialPageSize;
  private _pageCount: number;
  private _sortRule: TableSortRule = new TableSortRule();
  private _rows: R[] = [];

  private _recordsFound: number;
  private _numberOfRecords: number;

  public startLoading(): void {
    this._loading = true;
    this._events.next(TableEvent.LOADING);
  }

  public stopLoading(): void {
    this._loading = false;
    this._events.next(TableEvent.UPDATED);
  }

  public isEmpty(): boolean {
    return this.dirty && this._empty;
  }

  public updateTable(page: number, pageSize: number, rows: R[], pageCount?: number): void {
    this._page = page;
    this._pageSize = pageSize;
    this.updateRows(rows, pageCount);
  }

  public updateRows(rows: R[], pageCount?: number): void {
    this._empty = rows.length === 0;
    this._rows = rows;
    this._pageCount = pageCount !== undefined ? pageCount : Math.floor(rows.length / this._pageSize) + 1;
    this._error = false;
    this._dirty = true;
    this._loading = false;
    this._events.next(TableEvent.UPDATED);
  }

  public updatePage(page: number): void {
    this._page = page;
  }

  public updatePageSize(pageSize: number, pageCount?: number): void {
    this._pageSize = pageSize;
    this._pageCount = pageCount !== undefined ? pageCount : Math.floor(this._rows.length / this._pageSize) + 1;
  }

  public updateRecordsFound(recordsFound: number): void {
    this._recordsFound = recordsFound;
  }

  public updateNumberOfRecords(numberOfRecords: number): void {
    this._numberOfRecords = numberOfRecords;
  }

  public setError(): void {
    this._dirty = true;
    this._loading = false;
    this._error = true;
    this._events.next(TableEvent.UPDATED);
  }

  public isSorted(name: string): string {
    if (this.sortRule.column !== name) {
      return '';
    }
    switch (this.sortRule.type) {
      case 'asc':
        return 'ascending';
      case 'desc':
        return 'descending';
      default:
        return '';
    }
  }

  public setExportStartStatus(): void {
    this._exporting = true;
  }

  public setExportEndStatus(): void {
    this._exporting = false;
  }

  public abstract getRows(): R[];

  get events(): Subject<TableEvent> {
    return this._events;
  }

  get exporting(): boolean {
    return this._exporting;
  }

  get loading(): boolean {
    return this._loading;
  }

  get dirty(): boolean {
    return this._dirty;
  }

  get error(): boolean {
    return this._error;
  }

  get page(): number {
    return this._page;
  }

  get pageSize(): number {
    return this._pageSize;
  }

  get pageCount(): number {
    return this._pageCount;
  }

  get sortRule(): TableSortRule {
    return this._sortRule;
  }

  get rows(): R[] {
    return this._rows;
  }

  get recordsFound(): number {
    return this._recordsFound;
  }

  get numberOfRecords(): number {
    return this._numberOfRecords;
  }
}

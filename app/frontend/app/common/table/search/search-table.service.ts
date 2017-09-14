import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { DatabaseColumnInfo } from '../../../database/database-metadata';
import { SearchTableRow } from './row/search-table-row';

@Injectable()
export class SearchTableService {
    private _dirty: boolean = false;
    private _page: number = 0;
    private _pageSize: number = 0;
    private _rows: Subject<SearchTableRow[]> = new ReplaySubject(1);
    private _columns: DatabaseColumnInfo[] = [];

    public update(table: any): void {
        this._page = table.page;
        this._pageSize = table.pageSize;
        this._rows.next(table.rows.map((row: any) => new SearchTableRow(row)));
        this._dirty = true;
    }

    public updateColumns(columns: DatabaseColumnInfo[]): void {
        this._columns = columns;
    }

    get page() {
        return this._page;
    }

    get pageSize() {
        return this._pageSize;
    }

    get rows() {
        return this._rows;
    }

    get columns() {
        return this._columns;
    }

    get dirty() {
        return this._dirty;
    }
}

import { Injectable } from "@angular/core";
import { SearchTableRow } from "./row/search-table-row";
import { DomSanitizer } from "@angular/platform-browser";

@Injectable()
export class SearchTableService {
    private _dirty: boolean = false;
    private _page: number = 0;
    private _pageSize: number = 0;
    private _rows: SearchTableRow[] = [];
    private _columns: string[] = [];

    update(table: any): void {
        this._page = table.page;
        this._pageSize = table.pageSize;
        this._rows = table.rows.map((row: any) => new SearchTableRow(row));
        this._dirty = true;
    }

    updateColumns(columns: string[]) : void {
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
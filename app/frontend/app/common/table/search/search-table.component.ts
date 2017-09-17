import { Component, ElementRef, ViewChild } from '@angular/core';
import { SearchTableService } from './search-table.service';

@Component({
    selector:        'search-table',
    templateUrl:     './search-table.component.html',
    styleUrls:       [ './search-table.component.css' ]
})
export class SearchTableComponent {

    @ViewChild('pagination')
    public pagination: ElementRef;

    constructor(public table: SearchTableService) {}

    public isLoading(): boolean {
        return this.table.loading || !this.table.dirty;
    }

    public pageChange(page: number): void {
        this.table.pageChange(page);
    }

    public isSorted(column: string): string[] {
        if (this.table.sortRule.column !== column) {
            return [];
        }
        switch (this.table.sortRule.type) {
            case 'asc':
                return [ 'ascending' ];
            case 'desc':
                return [ 'descending' ];
            default:
                return [];
        }
    }
}

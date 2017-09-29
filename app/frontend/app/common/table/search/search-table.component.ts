import { ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { SearchTableService } from './search-table.service';

@Component({
    selector:        'search-table',
    templateUrl:     './search-table.component.html',
    styleUrls:       [ './search-table.component.css' ]
})
export class SearchTableComponent implements OnInit {
    private static _resizeEventWaitTime: number = 200;
    private _resizeEventTimeout: number;
    public headerFontSize: string;

    @ViewChild('pagination')
    public pagination: ElementRef;

    constructor(public table: SearchTableService, private changeDetector: ChangeDetectorRef) {}

    @HostListener('window:resize', ['$event'])
    public onResize() {
        window.clearTimeout(this._resizeEventTimeout);
        this._resizeEventTimeout = window.setTimeout(() => {
            this.calculateHeaderFontSize();
        }, SearchTableComponent._resizeEventWaitTime);
    }

    public ngOnInit(): void {
        this.calculateHeaderFontSize();
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

    private calculateHeaderFontSize(): void {
        // const magickA = 0.00015625;
        // const magickB = 0.6;
        const magickA = 0.0003125;
        const magickB = 0.4;
        const headerSize = magickA * window.innerWidth + magickB;
        this.headerFontSize = headerSize + 'em';
        this.changeDetector.detectChanges();
    }
}

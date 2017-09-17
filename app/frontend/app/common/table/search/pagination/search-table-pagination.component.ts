import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { InputConverter, NumberConverter } from '../../../../utils/input-converter.decorator';
import { Utils } from '../../../../utils/utils';

@Component({
    selector:        'search-table-pagination',
    templateUrl:     './search-table-pagination.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTablePaginationComponent implements OnInit {
    private _page: number = 0;
    private _pageCount: number = 0;

    @Input()
    @InputConverter(NumberConverter)
    public set page(newPage: number) {
        this._page = newPage;
        this.calculatePageNumbers();
    }

    public get page() {
        return this._page;
    }

    @Input()
    @InputConverter(NumberConverter)
    public set pageCount(newPageCount: number) {
        this._pageCount = newPageCount;
        this.calculatePageNumbers();
    }

    public get pageCount() {
        return this._pageCount;
    }

    @Output()
    public pageChange = new EventEmitter();

    @Input()
    @InputConverter(NumberConverter)
    public range: number;

    public pageNumbers: number[] = [];

    public ngOnInit(): void {
        this.calculatePageNumbers();
    }

    public isCurrent(page: number): boolean {
        return this.page === page;
    }

    public selectPage(page: number): void {
        if (page >= 0 && page <= this.pageCount && this.page !== page) {
            this.page = page;
            this.pageChange.emit(this.page);
            this.calculatePageNumbers();
        }
    }

    public first(): void {
        this.selectPage(0);
    }

    public previous(): void {
        this.selectPage(this.page - 1);
    }

    public next(): void {
        this.selectPage(this.page + 1);
    }

    public last(): void {
        this.selectPage(this.pageCount);
    }

    private calculatePageNumbers(): void {
        const ranges = this.calculateRange();
        Utils.Array.clear(this.pageNumbers);
        for (let i = ranges.min; i <= ranges.max; ++i) {
            this.pageNumbers.push(i + 1);
        }
    }

    private calculateRange(): { min: number, max: number } {
        if (this.range >= this.pageCount) {
            return {
                min: 0,
                max: this.pageCount
            };
        }

        let min = this.page - this.range;
        let max = this.page + this.range;

        if (min < 0) {
            max -= min;
            min = 0;
        } else if (max > this.pageCount) {
            min -= (max - this.pageCount);
            max = this.pageCount;
        }

        return { min, max };
    }

}

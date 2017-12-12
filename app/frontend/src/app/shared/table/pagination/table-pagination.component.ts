/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Utils } from '../../../utils/utils';

@Component({
    selector:        'table-pagination',
    templateUrl:     './table-pagination.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TablePaginationComponent implements OnInit {
    private _page: number = 0;
    private _pageCount: number = 0;

    @Input()
    public set page(newPage: number) {
        this._page = newPage;
        this.calculatePageNumbers();
    }

    @Input()
    public set pageCount(newPageCount: number) {
        this._pageCount = newPageCount;
        this.calculatePageNumbers();
    }

    @Output()
    public pageChange = new EventEmitter();

    @Input()
    public range: number;

    public pageNumbers: number[] = [];

    public ngOnInit(): void {
        this.calculatePageNumbers();
    }

    public isCurrent(page: number): boolean {
        return this._page === page;
    }

    public selectPage(page: number): void {
        if (page >= 0 && page < this._pageCount && this._page !== page) {
            this._page = page;
            this.pageChange.emit(this._page);
            this.calculatePageNumbers();
        }
    }

    public first(): void {
        this.selectPage(0);
    }

    public previous(): void {
        this.selectPage(this._page - 1);
    }

    public next(): void {
        this.selectPage(this._page + 1);
    }

    public last(): void {
        this.selectPage(this._pageCount - 1);
    }

    private calculatePageNumbers(): void {
        const ranges = this.calculateRange();
        Utils.Array.clear(this.pageNumbers);
        for (let i = ranges.min; i <= ranges.max; ++i) {
            this.pageNumbers.push(i + 1);
        }
    }

    private calculateRange(): { min: number, max: number } {
        if (this.range * 2 >= this._pageCount) {
            return {
                min: 0,
                max: this._pageCount - 1
            };
        }

        let min = this._page - this.range;
        let max = this._page + this.range;

        if (min < 0) {
            max -= min;
            min = 0;
        } else if (max > (this._pageCount - 1)) {
            min -= (max - (this._pageCount - 1));
            max = this._pageCount - 1;
        }

        return { min, max };
    }
}

/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { Component, OnDestroy, OnInit } from '@angular/core';
import { SearchTable } from 'pages/search/table/search/search-table';
import { FiltersService } from 'shared/filters/filters.service';
import { TableColumn } from 'shared/table/column/table-column';
import { AnalyticsService } from 'utils/analytics/analytics.service';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';
import { SearchTableService } from './table/search/search-table.service';

@Component({
    selector:    'search',
    templateUrl: './search.component.html'
})
export class SearchPageComponent implements OnInit, OnDestroy {
    public columns: TableColumn[] = [];
    public table: SearchTable;

    constructor(private searchTableService: SearchTableService, private filters: FiltersService,
                logger: LoggerService, notifications: NotificationService, analytics: AnalyticsService) {
        this.table = new SearchTable(searchTableService, filters, analytics, logger, notifications);
        if (this.searchTableService.isInitialized()) {
            this.fetchColumns();
            this.table.updateNumberOfRecords(this.searchTableService.getMetadata().numberOfRecords);
        }
    }

    public ngOnInit(): void {
        if (!this.searchTableService.isInitialized()) {
            this.searchTableService.waitInitialization().then(() => {
                this.fetchColumns();
                this.table.updateNumberOfRecords(this.searchTableService.getMetadata().numberOfRecords);
                if (!this.table.dirty) {
                    this.table.update();
                }
            });
        }
    }

    public search(): void {
        this.table.update();
    }

    public reset(): void {
        this.filters.setDefault();
    }

    public isLoading(): boolean {
        return this.table.loading || !this.table.dirty;
    }

    public ngOnDestroy(): void {
        this.table.destroy();
    }

    private fetchColumns(): void {
        const metadata = this.searchTableService.getMetadata();
        this.columns = metadata.columns.map((c) => {
            return new TableColumn(c.name, c.title, true, false, false, true, c.comment, 'Click to sort column');
        });
    }
}

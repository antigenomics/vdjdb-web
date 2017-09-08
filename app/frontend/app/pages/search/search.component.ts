import { Component, ElementRef, ViewChild } from '@angular/core';
import { FiltersService } from '../../common/filters/filters.service';
import { DatabaseService, DatabaseServiceActions } from '../../database/database.service';
import { Filter } from '../../common/filters/filters';
import { LoggerService } from '../../utils/logger/logger.service';
import { LoggerErrorNotificationMessage, LoggerInfoDebugMessage, LoggerWarningNotificationMessage } from '../../utils/logger/logger-messages';
import { SearchTableService } from "../../common/table/search/search-table.service";
import { DatabaseColumnInfo, DatabaseMetadata } from "../../database/database-metadata";
import { Utils } from "../../utils/scroll.util";

@Component({
    selector:    'search',
    templateUrl: './search.component.html'
})
export class SearchPageComponent {
    loading: boolean;

    @ViewChild('tableRow') tableRow: ElementRef;

    constructor(private filters: FiltersService,
                private database: DatabaseService,
                private table: SearchTableService,
                private logger: LoggerService) {
        this.loading = false;

        this.database.getMetadata().take(1).subscribe({
            next: (metadata: DatabaseMetadata) => {
                this.table.updateColumns(metadata.columns.map((c: DatabaseColumnInfo) => c.title));
            }
        });

        if (!table.dirty) {
            setTimeout(() => {
                this.search(false);
            }, 1000)
        }
    }

    search(scrollToTable: boolean = true): void {
        if (!this.loading) {
            this.loading = true;

            this.filters.getFilters((filters: Filter[]) => {
                this.database.filter(filters);
                this.logger.log(new LoggerInfoDebugMessage(filters, 'Collected filters'));
            }, (message: string) => {
                this.logger.log(new LoggerErrorNotificationMessage(message, 'Filters error'));
            }, () => {
                this.logger.log(new LoggerInfoDebugMessage('Search complete'))
            });

            this.database.getMessages(DatabaseServiceActions.SearchAction).take(1).subscribe({
                next: (table: any) => {
                    this.table.update(table);
                    this.loading = false;
                    if (scrollToTable) Utils.scroll(this.tableRow.nativeElement);
                }
            })
        } else {
            this.logger.log(new LoggerWarningNotificationMessage('Loading', 'Search'))
        }
    }

    reset(): void {
        this.filters.setDefault();
    }
}
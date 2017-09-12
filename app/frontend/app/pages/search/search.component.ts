import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
import { FiltersService } from '../../common/filters/filters.service';
import { DatabaseService, DatabaseServiceActions } from '../../database/database.service';
import { Filter } from '../../common/filters/filters';
import { LoggerService } from '../../utils/logger/logger.service';
import { LoggerErrorNotificationMessage, LoggerInfoDebugMessage, LoggerWarningNotificationMessage } from '../../utils/logger/logger-messages';
import { SearchTableService } from "../../common/table/search/search-table.service";
import { DatabaseMetadata } from "../../database/database-metadata";
import 'rxjs/add/operator/take'

@Component({
    selector:    'search',
    templateUrl: './search.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchPageComponent {
    loading: boolean;

    @ViewChild('tableRow') tableRow: ElementRef;

    constructor(private filters: FiltersService, private database: DatabaseService,
                private table: SearchTableService, private logger: LoggerService,
                private changeDetector: ChangeDetectorRef) {
        this.loading = false;

        this.database.getMetadata().take(1).subscribe({
            next: (metadata: DatabaseMetadata) => {
                this.table.updateColumns(metadata.columns);
            }
        });

        if (!table.dirty) {
            setTimeout(() => {
                this.filters.setDefault();
                this.search(false);
            }, 1000)
        }
    }

    //TODO scroll to table
    search(_: boolean = true): void {
        if (!this.loading) {
            this.loading = true;

            let filters: Filter[] = [];
            let errors: string[] = [];

            this.filters.getFilters(filters, errors);
            if (errors.length === 0) {
                this.logger.log(new LoggerInfoDebugMessage(filters, 'Collected filters'));
                this.database.filter(filters);
            } else {
                errors.forEach((error: string) => {
                    this.logger.log(new LoggerErrorNotificationMessage(error, 'Filters error'));
                });
            }

            this.database.getMessages(DatabaseServiceActions.SearchAction).take(1).subscribe({
                next: (table: any) => {
                    this.table.update(table);
                    this.loading = false;
                    // if (scrollToTable) Utils.scroll(this.tableRow.nativeElement);
                }
            })
        } else {
            this.logger.log(new LoggerWarningNotificationMessage('Loading', 'Search'))
        }
    }

    reset(): void {
        this.filters.setDefault();
        //this.changeDetector.detectChanges();
    }
}
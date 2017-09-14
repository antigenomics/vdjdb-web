import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
import { FiltersService } from '../../common/filters/filters.service';
import { DatabaseService, DatabaseServiceActions } from '../../database/database.service';
import { Filter } from '../../common/filters/filters';
import { LoggerService } from '../../utils/logger/logger.service';
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
                private table: SearchTableService, private logger: LoggerService) {
        this.loading = false;

        this.database.getMetadata().take(1).subscribe({
            next: (metadata: DatabaseMetadata) => {
                this.table.updateColumns(metadata.columns);
            }
        });

        if (!table.dirty) {
            setTimeout(() => {
                this.filters.setDefault();
                this.search();
            }, 1000)
        }
    }

    search(): void {
        if (!this.loading) {
            this.loading = true;

            let filters: Filter[] = [];
            let errors: string[] = [];

            this.filters.getFilters(filters, errors);
            if (errors.length === 0) {
                this.logger.debug('Collected filters', filters);
                this.database.getMessages(DatabaseServiceActions.SearchAction).take(1).subscribe({
                    next: (table: any) => {
                        this.table.update(table);
                        this.loading = false;
                    }
                });
                this.database.filter(filters);
            } else {
                errors.forEach((error: string) => {
                    this.logger.error('Filters error', error, true);
                });
                this.loading = false;
            }
        } else {
            this.logger.warn('Search', 'Loading', true)
        }
    }

    reset(): void {
        this.filters.setDefault();
    }
}
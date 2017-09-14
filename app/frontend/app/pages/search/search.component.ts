import { ChangeDetectionStrategy, Component, ElementRef, ViewChild } from '@angular/core';
import 'rxjs/add/operator/take';
import { Filter } from '../../common/filters/filters';
import { FiltersService } from '../../common/filters/filters.service';
import { SearchTableService } from '../../common/table/search/search-table.service';
import { DatabaseMetadata } from '../../database/database-metadata';
import { DatabaseService, DatabaseServiceActions } from '../../database/database.service';
import { LoggerService } from '../../utils/logger/logger.service';

@Component({
    selector:        'search',
    templateUrl:     './search.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchPageComponent {
    public static initialSearchTimeout = 1000;

    @ViewChild('tableRow')
    private tableRow: ElementRef;

    public loading: boolean;

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
            },         SearchPageComponent.initialSearchTimeout);
        }
    }

    public search(): void {
        if (!this.loading) {
            this.loading = true;

            const filters: Filter[] = [];
            const errors: string[] = [];

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
            this.logger.warn('Search', 'Loading', true);
        }
    }

    public reset(): void {
        this.filters.setDefault();
    }
}

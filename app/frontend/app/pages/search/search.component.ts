import { Component } from '@angular/core';
import { FiltersService } from '../../common/filters/filters.service';
import { DatabaseService } from '../../database/database.service';
import { Filter } from '../../common/filters/filters';
import { LoggerService } from '../../utils/logger/logger.service';
import { LoggerErrorNotificationMessage, LoggerInfoDebugMessage } from '../../utils/logger/logger-messages';

@Component({
    selector:    'search',
    templateUrl: './search.component.html'
})
export class SearchPageComponent {
    loading: boolean;

    constructor(private filters: FiltersService, private database: DatabaseService, private logger: LoggerService) {
        this.loading = false;
    }

    search(): void {
        this.loading = true;
        this.filters.getFilters((filters: Filter[]) => {
            this.database.filter(filters);
            this.logger.log(new LoggerInfoDebugMessage(filters, 'Collected filters'));
        }, (message: string) => {
            this.logger.log(new LoggerErrorNotificationMessage(message, 'Filters error'));
        }, () => {
            this.loading = false;
            this.logger.log(new LoggerInfoDebugMessage('Search complete'))
        })
    }

    reset(): void {
        this.filters.setDefault();
    }
}
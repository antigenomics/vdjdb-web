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
    title: string;

    constructor(private filters: FiltersService, private database: DatabaseService, private logger: LoggerService) {

    }

    search(): void {
        this.filters.getFilters((filters: Filter[]) => {
            this.logger.log(new LoggerInfoDebugMessage(filters, 'Collected filters'));
        }, (message: string) => {
            this.logger.log(new LoggerErrorNotificationMessage(message, 'Filters error'));
        })
    }

    reset(): void {
        this.filters.setDefault();
    }
}
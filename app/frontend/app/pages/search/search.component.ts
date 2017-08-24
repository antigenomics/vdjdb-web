import { Component } from '@angular/core';
import { FiltersService } from "../../common/filters/filters.service";
import { DatabaseService } from "../../database/database.service";
import { DatabaseMetadata } from "../../database/database-metadata";
import { Filter } from "../../common/filters/filters";


@Component({
    selector:    'search',
    templateUrl: './search.component.html'
})
export class SearchPageComponent {
    title: string;

    constructor(private filters: FiltersService, private database: DatabaseService) {

    }

    search(): void {
        this.filters.getFilters((filters: Filter[]) => {
            console.log(filters);
        })
    }

    reset(): void {
        this.filters.setDefault();
    }
}
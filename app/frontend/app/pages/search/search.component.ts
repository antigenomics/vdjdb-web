import { Component } from '@angular/core';
import { FiltersService } from "../../common/filters/filters.service";
import { DatabaseService } from "../../database/database.service";
import { DatabaseMetadata } from "../../database/database-metadata";

@Component({
    selector: 'search',
    templateUrl: './search.component.html'
})
export class SearchPageComponent {
    title: string;

    constructor(private filters: FiltersService, private database: DatabaseService) {

    }

    search() : void {
        //console.log(this.filters.getFilters());
    }

    reset() : void {
        this.filters.setDefault();
    }
}
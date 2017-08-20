import { Component } from '@angular/core';
import { FiltersService } from "../../common/filters/filters.service";

@Component({
    selector: 'search',
    templateUrl: './search.component.html'
})
export class SearchPageComponent {
    title: string;

    constructor(private filters: FiltersService) {

    }

    search() : void {
        console.log(this.filters.getFilters());
    }

    reset() : void {
        this.filters.setDefault();
    }
}
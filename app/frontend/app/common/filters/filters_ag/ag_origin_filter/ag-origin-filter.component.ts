import { Component } from '@angular/core';
import { AGFiltersService } from "../ag-filters.service";


@Component({
    selector:        'ag-origin-filter',
    templateUrl:     './ag-origin-filter.component.html'
})
export class AGOriginFilterComponent {
    constructor(public ag: AGFiltersService) {}
}
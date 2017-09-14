import { Component } from '@angular/core';
import { AGFiltersService } from '../ag-filters.service';

@Component({
    selector:        'ag-epitope-filter',
    templateUrl:     './ag-epitope-filter.component.html'
})
export class AGEpitopeFilterComponent {
    constructor(public ag: AGFiltersService) {}
}

import { Component } from '@angular/core';
import { TCRFiltersService } from '../tcr-filters.service';

@Component({
    selector:        'tcr-cdr3-filter',
    templateUrl:     './tcr-cdr3-filter.component.html'
})
export class TcrCdr3FilterComponent {
    constructor(public tcr: TCRFiltersService) {}
}

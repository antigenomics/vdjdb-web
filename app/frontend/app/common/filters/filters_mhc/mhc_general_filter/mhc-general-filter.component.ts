import { Component } from '@angular/core';
import { MHCFiltersService } from '../mhc-filters.service';

@Component({
    selector:        'mhc-general-filter',
    templateUrl:     './mhc-general-filter.component.html'
})
export class MHCGeneralFilterComponent {
    constructor(public mhc: MHCFiltersService) {}
}

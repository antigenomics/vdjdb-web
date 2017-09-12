import { Component } from '@angular/core';
import { TCRFiltersService } from "../tcr-filters.service";


@Component({
    selector:        'tcr-general-filter',
    templateUrl:     './tcr-general-filter.component.html'
})
export class TCRGeneralFilterComponent {
    constructor(public tcr: TCRFiltersService) {
    }
}
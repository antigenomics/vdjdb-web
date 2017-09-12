import { Component } from '@angular/core';
import { TCRFiltersService } from "../tcr-filters.service";


@Component({
    selector:        'tcr-segments-filter',
    templateUrl:     './tcr-segments-filter.component.html'
})
export class TCRSegmentsFilterComponent {
    constructor(public tcr: TCRFiltersService) {

    }
}
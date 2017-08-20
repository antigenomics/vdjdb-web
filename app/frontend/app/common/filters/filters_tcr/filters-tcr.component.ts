import { Component } from '@angular/core';
import { FiltersTCRService } from "./filters-tcr.service";

@Component({
    selector:    'filters-tcr',
    templateUrl: './filters-tcr.component.html'
})
export class FiltersTCRComponent {
    constructor(public filters: FiltersTCRService) {}
}
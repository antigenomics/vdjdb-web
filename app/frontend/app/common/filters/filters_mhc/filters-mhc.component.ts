import { Component } from '@angular/core';
import { FiltersMHCService } from "./filters-mhc.service";

@Component({
    selector:    'filters-mhc',
    templateUrl: './filters-mhc.component.html'
})
export class FiltersMHCComponent {
    constructor(public filters: FiltersMHCService) {}
}
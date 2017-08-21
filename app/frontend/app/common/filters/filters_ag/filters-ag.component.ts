import { Component } from '@angular/core';
import { FiltersAGService } from "./filters-ag.service";

@Component({
    selector:    'filters-ag',
    templateUrl: './filters-ag.component.html'
})
export class FiltersAGComponent {
    constructor(public filters: FiltersAGService) {}
}
import { Component } from '@angular/core';
import { FiltersMetaService } from "./filters-meta.service";

@Component({
    selector:    'filters-meta',
    templateUrl: './filters-meta.component.html'
})
export class FiltersMetaComponent {
    constructor(public filters: FiltersMetaService) {}
}
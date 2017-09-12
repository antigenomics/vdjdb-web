import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AGFiltersService } from "../ag-filters.service";


@Component({
    selector:        'ag-origin-filter',
    templateUrl:     './ag-origin-filter.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AGOriginFilterComponent {
    constructor(public ag: AGFiltersService) {}
}
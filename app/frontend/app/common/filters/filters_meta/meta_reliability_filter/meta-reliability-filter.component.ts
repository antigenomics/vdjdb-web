import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MetaFiltersService } from "../meta-filters.service";


@Component({
    selector:        'meta-reliability-filter',
    templateUrl:     './meta-reliability-filter.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetaReliabilityFilterComponent {
    constructor(public meta: MetaFiltersService) {
    }
}
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MetaFiltersService } from "../meta-filters.service";


@Component({
    selector:        'meta-general-filter',
    templateUrl:     './meta-general-filter.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MetaGeneralFilterComponent {
    constructor(public meta: MetaFiltersService) {
    }
}
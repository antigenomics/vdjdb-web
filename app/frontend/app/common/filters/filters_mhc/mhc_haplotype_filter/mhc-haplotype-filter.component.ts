import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MHCFiltersService } from "../mhc-filters.service";


@Component({
    selector:        'mhc-haplotype-filter',
    templateUrl:     './mhc-haplotype-filter.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MHCHaplotypeFilterComponent {
    constructor(public mhc: MHCFiltersService) {}
}
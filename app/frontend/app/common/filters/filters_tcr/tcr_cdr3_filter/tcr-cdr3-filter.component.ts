import { ChangeDetectorRef, Component } from '@angular/core';
import { TCRFiltersService } from '../tcr-filters.service';

@Component({
    selector:        'tcr-cdr3-filter',
    templateUrl:     './tcr-cdr3-filter.component.html'
})
export class TCRcdr3FilterComponent {
    constructor(public tcr: TCRFiltersService, private changeDetector: ChangeDetectorRef) {}

    public checkRangeInput(key: string, input: number, min: number, max: number): void {
        switch (key) {
            case 'levensteinSubstitutions':
                this.tcr.cdr3.levensteinSubstitutions = -1;
                break;
            case 'levensteinInsertions':
                this.tcr.cdr3.levensteinInsertions = -1;
                break;
            case 'levensteinDeletions':
                this.tcr.cdr3.levensteinDeletions = -1;
                break;
            default:
                break;
        }
        this.changeDetector.detectChanges();
        let value = 0;
        if (isNaN(Number(input)) || input === null || input === undefined) {
            value = min;
        } else if (input < min) {
            value = min;
        } else if (input > max) {
            value = max;
        } else {
            value = input;
        }
        switch (key) {
            case 'levensteinSubstitutions':
                this.tcr.cdr3.levensteinSubstitutions = value;
                break;
            case 'levensteinInsertions':
                this.tcr.cdr3.levensteinInsertions = value;
                break;
            case 'levensteinDeletions':
                this.tcr.cdr3.levensteinDeletions = value;
                break;
            default:
                break;
        }
        this.changeDetector.detectChanges();
    }
}

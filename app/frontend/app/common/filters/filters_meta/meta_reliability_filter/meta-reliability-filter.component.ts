import { ChangeDetectorRef, Component } from '@angular/core';
import { MetaFiltersService } from '../meta-filters.service';

@Component({
    selector:        'meta-reliability-filter',
    templateUrl:     './meta-reliability-filter.component.html'
})
export class MetaReliabilityFilterComponent {
    constructor(public meta: MetaFiltersService, private changeDetector: ChangeDetectorRef) {}

    public checkConfidenceScore(score: number): void {
        this.meta.reliability.minimalConfidenceScore = -1;
        this.changeDetector.detectChanges();
        if (isNaN(Number(score)) || score === null || score === undefined) {
            this.meta.reliability.minimalConfidenceScore = this.meta.reliability.confidenceScoreMin;
        } else if (score > this.meta.reliability.confidenceScoreMax) {
            this.meta.reliability.minimalConfidenceScore = this.meta.reliability.confidenceScoreMax;
        } else if (score < this.meta.reliability.confidenceScoreMin) {
            this.meta.reliability.minimalConfidenceScore = this.meta.reliability.confidenceScoreMin;
        } else {
            this.meta.reliability.minimalConfidenceScore = score;
        }
        this.changeDetector.detectChanges();
    }
}

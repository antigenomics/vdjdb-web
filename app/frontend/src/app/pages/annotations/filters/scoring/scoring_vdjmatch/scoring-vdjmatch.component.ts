/*
 *     Copyright 2017 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { AnnotationsFilters } from 'pages/annotations/filters/annotations-filters';
import { SliderRangeModel } from 'shared/filters/common/slider/slider.component';

@Component({
    selector: 'scoring-vdjmatch',
    templateUrl: './scoring-vdjmatch.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScoringVDJMatchComponent implements OnInit {
    public sliderModel: SliderRangeModel;

    @Input('filters')
    public filters: AnnotationsFilters;

    @Input('disabled')
    public disabled: boolean;

    constructor(private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this.sliderModel = new SliderRangeModel(0, this.filters.scoring.vdjmatch.hitFiltering.propabilityThreshold);
    }

    public isDisabled() {
        return this.disabled ? '' : undefined;
    }

    public isBestHitSelected(): boolean {
        return this.filters.scoring.vdjmatch.hitFiltering.bestHit;
    }

    public setBestHit(value: boolean): void {
        this.filters.scoring.vdjmatch.hitFiltering.bestHit = value;
    }

    public checkSliderModel(model: SliderRangeModel): void {
        this.filters.scoring.vdjmatch.hitFiltering.propabilityThreshold = model.max;
        this.sliderModel.max = model.max;
    }

    public checkExhaustiveAlignment(value: number): void {
        this.filters.scoring.vdjmatch.exhaustiveAlignment = -1;
        this.changeDetector.detectChanges();
        this.filters.scoring.vdjmatch.exhaustiveAlignment = this.filters.validateRange(AnnotationsFilters.exhaustiveAlignmentRange, value);
        this.changeDetector.detectChanges();
    }

    public checkScoringMode(value: number): void {
        this.filters.scoring.vdjmatch.scoringMode = -1;
        this.changeDetector.detectChanges();
        this.filters.scoring.vdjmatch.scoringMode = this.filters.validateRange(AnnotationsFilters.scoringModeRange, value);
        this.changeDetector.detectChanges();
    }

    public checkTopHitsCount(value: number): void {
        this.filters.scoring.vdjmatch.hitFiltering.topHitsCount = -1;
        this.changeDetector.detectChanges();
        this.filters.scoring.vdjmatch.hitFiltering.topHitsCount = this.filters.validateRange(AnnotationsFilters.scoringModeRange, value);
        this.changeDetector.detectChanges();
    }
}

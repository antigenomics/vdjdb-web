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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { AnnotationsFilters } from 'pages/annotations/filters/annotations-filters';
import { SliderRangeModel } from 'shared/filters/common/slider/slider.component';

@Component({
    selector: 'scoring-vdjmatch',
    templateUrl: './scoring-vdjmatch.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScoringVDJMatchComponent {
    private _filters: AnnotationsFilters;

    public slider: SliderRangeModel;

    @Input('filters')
    public set filters(filters: AnnotationsFilters) {
        this._filters = filters;
        this.slider = new SliderRangeModel(0, this.filters.scoring.vdjmatch.hitFiltering.probabilityThreshold);
    }

    public get filters(): AnnotationsFilters {
        return this._filters;
    }

    @Input('disabled')
    public disabled: boolean;

    constructor(private changeDetector: ChangeDetectorRef) { }

    public isDisabled() {
        return this.disabled ? '' : undefined;
    }

    public isHitType(type: string): boolean {
        return this.filters.scoring.vdjmatch.hitFiltering.hitType === type;
    }

    public setHitType(type: 'best' | 'top' | 'all'): void {
        this.filters.scoring.vdjmatch.hitFiltering.hitType = type;
    }

    public checkSlider(model: SliderRangeModel): void {
        this.filters.scoring.vdjmatch.hitFiltering.probabilityThreshold = model.max;
        this.slider.max = model.max;
    }

    public checkExhaustiveAlignment(value: number): void {
        this.filters.scoring.vdjmatch.exhaustiveAlignment = -1;
        this.changeDetector.detectChanges();
        this.filters.scoring.vdjmatch.exhaustiveAlignment = this.filters.validateRange(AnnotationsFilters.exhaustiveAlignmentRange, value);
        this.changeDetector.detectChanges();
    }

    public getExhaustiveAlignmentShortTitle(value: number): string {
        switch (value) {
            case 0: return 'Disabled';
            case 1: return 'Best alignment for smallest edit distance';
            case 2: return 'Best alignment across all edit distances';
            default: return '';
        }
    }

    public checkScoringMode(value: number): void {
        this.filters.scoring.vdjmatch.scoringMode = -1;
        this.changeDetector.detectChanges();
        this.filters.scoring.vdjmatch.scoringMode = this.filters.validateRange(AnnotationsFilters.scoringModeRange, value);
        this.changeDetector.detectChanges();
    }

    public getScoringModeShortTitle(value: number): string {
        switch (value) {
            case 0: return 'Scores mismatches only';
            case 1: return 'Compute score for whole sequences';
            default: return '';
        }
    }

    public checkTopHitsCount(value: number): void {
        this.filters.scoring.vdjmatch.hitFiltering.topHitsCount = -1;
        this.changeDetector.detectChanges();
        this.filters.scoring.vdjmatch.hitFiltering.topHitsCount = this.filters.validateRange(AnnotationsFilters.topHitsCountRange, value);
        this.changeDetector.detectChanges();
    }
}

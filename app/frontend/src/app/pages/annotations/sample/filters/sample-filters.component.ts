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

import { ChangeDetectorRef, Component, Input } from '@angular/core';
import { SampleFilters } from 'pages/annotations/sample/filters/sample-filters';

@Component({
    selector: 'sample-filters',
    templateUrl: './sample-filters.component.html'
})
export class AnnotationsFiltersComponent {
    private static hammingDistanceRange = { min: 0, max: 3 };
    private static confidenceThresholdRange = { min: 0, max: 3 };
    private static epitopeSizeRange = { min: 0, max: 1000 };

    @Input('filters')
    public filters: SampleFilters;

    @Input('disabled')
    public disabled: boolean;

    constructor(private changeDetector: ChangeDetectorRef) {}

    public checkHammingDistance(distance: number): void {
        this.checkRange('hammingDistance', AnnotationsFiltersComponent.hammingDistanceRange, distance);
    }

    public checkConfidenceThreshold(threshold: number): void {
        this.checkRange('confidenceThreshold', AnnotationsFiltersComponent.confidenceThresholdRange, threshold);
    }

    public checkMinEpitopeSize(size: number): void {
        this.checkRange('minEpitopeSize', AnnotationsFiltersComponent.epitopeSizeRange, size);
    }

    private checkRange(name: string, range: { min: number, max: number }, value: number): void {
        const filters = this.filters as any;
        filters[name] = -1;
        this.changeDetector.detectChanges();
        if (isNaN(Number(value)) || value === null || value === undefined) {
            filters[name] = range.min;
        } else if (value >  range.max) {
            filters[name] =  range.max;
        } else if (value < range.min) {
            filters[name] = range.min;
        } else {
            filters[name] = value;
        }
        this.changeDetector.detectChanges();
    }
}

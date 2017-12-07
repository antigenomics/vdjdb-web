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
import { IntersectionTableFilters } from './intersection-table-filters';

@Component({
    selector: 'intersection-table-filters',
    templateUrl: './intersection-table-filters.component.html'
})
export class IntersectionTableFiltersComponent {
    private static hammingDistanceRange = { min: 0, max: 3 };
    private static confidenceThresholdRange = { min: 0, max: 3 };

    @Input('filters')
    public filters: IntersectionTableFilters;

    constructor(private changeDetector: ChangeDetectorRef) {}

    public checkHammingDistance(distance: number): void {
        this.filters.hammingDistance = -1;
        this.changeDetector.detectChanges();
        if (isNaN(Number(distance)) || distance === null || distance === undefined) {
            this.filters.hammingDistance = IntersectionTableFiltersComponent.hammingDistanceRange.min;
        } else if (distance >  IntersectionTableFiltersComponent.hammingDistanceRange.max) {
            this.filters.hammingDistance =  IntersectionTableFiltersComponent.hammingDistanceRange.max;
        } else if (distance < IntersectionTableFiltersComponent.hammingDistanceRange.min) {
            this.filters.hammingDistance = IntersectionTableFiltersComponent.hammingDistanceRange.min;
        } else {
            this.filters.hammingDistance = distance;
        }
        this.changeDetector.detectChanges();
    }

    public checkConfidenceThreshold(threshold: number): void {
        this.filters.confidenceThreshold = -1;
        this.changeDetector.detectChanges();
        if (isNaN(Number(threshold)) || threshold === null || threshold === undefined) {
            this.filters.confidenceThreshold = IntersectionTableFiltersComponent.confidenceThresholdRange.min;
        } else if (threshold >  IntersectionTableFiltersComponent.confidenceThresholdRange.max) {
            this.filters.confidenceThreshold =  IntersectionTableFiltersComponent.confidenceThresholdRange.max;
        } else if (threshold < IntersectionTableFiltersComponent.confidenceThresholdRange.min) {
            this.filters.confidenceThreshold = IntersectionTableFiltersComponent.confidenceThresholdRange.min;
        } else {
            this.filters.confidenceThreshold = threshold;
        }
        this.changeDetector.detectChanges();
    }
}

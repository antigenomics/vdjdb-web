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

import { environment } from 'environments/environment';

export interface IDatabaseQueryParams {
    species: string;
    gene: string;
    mhc: string;
    confidenceThreshold: number;
    minEpitopeSize: number;
}

export interface ISearchScopeHammingDistance {
    substitutions: number;
    insertions: number;
    deletions: number;
    total: number;
}

export interface ISearchScope {
    matchV: boolean;
    matchJ: boolean;
    hammingDistance: ISearchScopeHammingDistance;
}

export type IAnnotateScoringType = number;

export namespace IAnnotateScoringType {
    export const SIMPLE: number = 0;
    export const VDJMATCH: number = 1;
}

export interface IVDJMatchScoringHitFilteringOptions {
    propabilityThreshold: number;
    bestHit: boolean;
    topHitsCount: number;
    weightByInfo: boolean;
}

export interface IVDJMatchScoringOptions {
    exhaustiveAlignment: number;
    scoringMode: number;
    hitFiltering: IVDJMatchScoringHitFilteringOptions;
}

export interface IAnnotateScoring {
    type: IAnnotateScoringType;
    vdjmatch: IVDJMatchScoringOptions;
}

export class AnnotationsFilters {
    public static hammingDistanceRange = environment.application.annotations.filters.hammingDistance.range;
    public static confidenceThresholdRange = { min: 0, max: 3 };
    public static epitopeSizeRange = { min: 0, max: 1000 };
    public static exhaustiveAlignmentRange = { min: 0, max: 2 };
    public static scoringModeRange = { min: 0, max: 1 };
    public static topHitsCountRange = { min: 1, max: 100 };

    public databaseQueryParams: IDatabaseQueryParams = { species: 'HomoSapiens', gene: 'TRB', mhc: 'MHCI+II', confidenceThreshold: 0, minEpitopeSize: 10 };
    public searchScope: ISearchScope = { matchV: false, matchJ: false, hammingDistance: { substitutions: 0, insertions: 0, deletions: 0, total: 0 } };
    public scoring: IAnnotateScoring = {
        type: IAnnotateScoringType.VDJMATCH, vdjmatch: {
            exhaustiveAlignment: 1, scoringMode: 1, hitFiltering: { propabilityThreshold: 50, bestHit: false, topHitsCount: 5, weightByInfo: false }
        }
    };

    public validateRange(range: { min: number, max: number }, value: number): number {
        if (isNaN(Number(value)) || value === null || value === undefined) {
            return range.min;
        } else if (value > range.max) {
            return range.max;
        } else if (value < range.min) {
            return range.min;
        } else {
            return value;
        }
    }

    public isScoringTypeSimple(): boolean {
        return this.scoring.type === IAnnotateScoringType.SIMPLE;
    }

    public setScoringTypeSimple(): void {
        this.scoring.type = IAnnotateScoringType.SIMPLE;
    }

    public isScoringTypeVDJMatch(): boolean {
        return this.scoring.type === IAnnotateScoringType.VDJMATCH;
    }

    public setScoringTypeVDJMatch(): void {
        this.scoring.type = IAnnotateScoringType.VDJMATCH;
    }
}

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

export class SampleFilters {
    public databaseQueryParams: IDatabaseQueryParams = { species: 'HomoSapiens', gene: 'TRB', mhc: 'MHCI+II', confidenceThreshold: 0, minEpitopeSize: 0 };
    public searchScope: ISearchScope = { matchV: false, matchJ: false, hammingDistance: { substitutions: 0, insertions: 0, deletions: 0, total: 0 } };
    public scoring: IAnnotateScoring = {
        type: IAnnotateScoringType.VDJMATCH, vdjmatch: {
            exhaustiveAlignment: 0, scoringMode: 0, hitFiltering: { propabilityThreshold: 0, topHitsCount: 0, weightByInfo: false }
        }
    };
    public hammingDistance: number = 0;
    public confidenceThreshold: number = 0;
    public minEpitopeSize: number = 0;
    public matchV: boolean = false;
    public matchJ: boolean = false;
    public species: string = 'HomoSapiens';
    public gene: string = 'TRB';
    public mhc: string = 'MHCI+II';
}

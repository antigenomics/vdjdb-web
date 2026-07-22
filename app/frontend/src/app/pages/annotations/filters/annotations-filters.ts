/*
 *     Copyright 2017-2019 Bagaev Dmitry
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
 */

export interface IDatabaseQueryParams {
  species: string;
  gene: string;
  mhc: string;
  hla: string;
  inTcrempMotif: boolean;
  inTcrnetMotif: boolean;
  independentValidationOnly: boolean;
  // 0 disables the filter; the checkbox in the UI toggles between 0 and 1.
  minConfidenceScore: number;
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

// Simple is the only scoring the application offers. VDJMatch scoring had a value here (1) and two
// components to configure it, but no template ever rendered them; the server now snaps anything other
// than Simple back to Simple (AnnotationsAnnotateScoring.sanitize), so there is nothing else to name.
export namespace IAnnotateScoringType {
  export const SIMPLE: number = 0;
}

export interface IVDJMatchScoringHitFilteringOptions {
  probabilityThreshold: number;
  hitType: 'best' | 'top' | 'all';
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

  // Assay confidence is the one evidence filter on by default. It is the most aggressive of the four
  // - vdjdb.score >= 1 retains roughly 8% of records - and that is the point: what survives it is the
  // set with direct experimental support, which is the honest starting point for an annotation. The
  // motif filters describe how a record relates to other records rather than how well it is evidenced,
  // so they are opt-in.
  public databaseQueryParams: IDatabaseQueryParams = {
    species: 'HomoSapiens', gene: 'TRB', mhc: 'MHCI+II', hla: '',
    inTcrempMotif: false, inTcrnetMotif: false, independentValidationOnly: false, minConfidenceScore: 1
  };
  public searchScope: ISearchScope = { matchV: false, matchJ: false, hammingDistance: { substitutions: 1, insertions: 0, deletions: 0, total: 1 } };
  public scoring: IAnnotateScoring = {
    type: IAnnotateScoringType.SIMPLE, vdjmatch: {
      exhaustiveAlignment: 1,
      scoringMode:         1,
      hitFiltering:        {
        probabilityThreshold: 50, hitType: 'top', topHitsCount: 3, weightByInfo: false
      }
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
}

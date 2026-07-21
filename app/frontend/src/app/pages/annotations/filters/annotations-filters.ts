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
  confidenceThreshold: number;
  minEpitopeSize: number;
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

export namespace IAnnotateScoringType {
  export const SIMPLE: number = 0;
  export const VDJMATCH: number = 1;
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
  public static confidenceThresholdRange = { min: 0, max: 3 };
  public static epitopeSizeRange = { min: 0, max: 1000 };
  public static exhaustiveAlignmentRange = { min: 0, max: 2 };
  public static scoringModeRange = { min: 0, max: 1 };
  public static topHitsCountRange = { min: 1, max: 10 };

  // TCREMP motif membership is the only evidence filter on by default: it names ~99.5k of the ~146k
  // distinct VDJdb records, so it still keeps roughly two thirds of the database. The others are far
  // more aggressive — TCRNET names ~41k records, and vdjdb.score >= 1 retains only ~8% of rows — so
  // they start off and are opt-in.
  public databaseQueryParams: IDatabaseQueryParams = {
    species: 'HomoSapiens', gene: 'TRB', mhc: 'MHCI+II', confidenceThreshold: 0, minEpitopeSize: 10, hla: '',
    inTcrempMotif: true, inTcrnetMotif: false, independentValidationOnly: false, minConfidenceScore: 0
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

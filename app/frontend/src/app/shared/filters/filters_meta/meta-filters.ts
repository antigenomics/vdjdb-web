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

import { SetEntry } from '../common/set/set-entry';
import { Filter, FilterInterface, FilterType, IFiltersOptions } from '../filters';

export class MetaGeneralFilter implements FilterInterface {
  public referencesSelected: SetEntry[] = [];
  public referencesValues: string[];

  public methodSort: boolean;
  public methodCulture: boolean;
  public methodPhage: boolean;
  public methodOther: boolean;

  public seqSanger: boolean;
  public seqAmplicon: boolean;
  public seqSingleCell: boolean;

  public setDefault(): void {
    this.referencesSelected = [];
    this.methodSort = true;
    this.methodCulture = true;
    this.methodPhage = true;
    this.methodOther = true;
    this.seqSanger = true;
    this.seqAmplicon = true;
    this.seqSingleCell = true;
  }

  public isDefault(): boolean {
    return this.referencesSelected.length === 0 &&
      this.methodSort === true && this.methodCulture === true && this.methodPhage === true && this.methodOther === true &&
      this.seqSanger === true && this.seqAmplicon === true && this.seqSingleCell === true;
  }

  public setOptions(options: IFiltersOptions): void {
    /* Disable tslint to prevent ClosureCompiler mangling */
    /* tslint:disable:no-string-literal */
    if (options.hasOwnProperty('referencesValues')) {
      this.referencesValues = options[ 'referencesValues' ];
    }
    /* tslint:enable:no-string-literal */
  }

  public collectFilters(filters: Filter[], _: string[]): void {
    if (this.referencesSelected.length > 0) {
      filters.push(new Filter('reference.id', FilterType.SUBSTRING_SET, false, SetEntry.toString(this.referencesSelected)));
    }
    if (this.methodSort === false) {
      filters.push(new Filter('web.method', FilterType.EXACT, true, 'sort'));
    }
    if (this.methodCulture === false) {
      filters.push(new Filter('web.method', FilterType.EXACT, true, 'culture'));
    }
    if (this.methodPhage === false) {
      // Phage-display records are bucketed as web.method='other'; the distinguishing signal is the
      // raw method metadata ("identification": "phage display, ..."), matched here via regex.
      filters.push(new Filter('method', FilterType.PATTERN, true, '.*phage.*'));
    }
    if (this.methodOther === false) {
      filters.push(new Filter('web.method', FilterType.EXACT, true, 'other'));
    }
    if (this.seqSanger === false) {
      filters.push(new Filter('web.method.seq', FilterType.EXACT, true, 'sanger'));
    }
    if (this.seqAmplicon === false) {
      filters.push(new Filter('web.method.seq', FilterType.EXACT, true, 'amplicon'));
    }
    if (this.seqSingleCell === false) {
      filters.push(new Filter('web.method.seq', FilterType.EXACT, true, 'singlecell'));
    }
  }

  public getFilterId(): string {
    return 'general';
  }
}

export class MetaReliabilityFilter implements FilterInterface {
  public confidenceScoreMin: number = 0;
  public confidenceScoreMax: number = 3;

  public minimalConfidenceScore: number;
  public nonCanonical: boolean;
  public unmapped: boolean;

  // Evidence: Validation. valTcrvdb is offered as a disabled "coming soon" box, so it never becomes
  // true from the UI and the server has no column for it yet.
  public valSameStudy: boolean;
  public valIndependent: boolean;
  public valTcrvdb: boolean;

  // Evidence: Motif
  public motifTcrnet: boolean;
  public motifTcremp: boolean;

  // Evidence: Structure
  public structNative: boolean;
  public structContacts: boolean;
  public structQuality: boolean;

  /** Each evidence kind, its filter id, and how to read its modes off the filter. */
  public static readonly evidenceKinds: ReadonlyArray<{
    filterId: string,
    modes: ReadonlyArray<{ mode: string, isTicked: (filter: MetaReliabilityFilter) => boolean }>
  }> = [
    { filterId: 'evidence:validation', modes: [
      { mode: 'same.study',  isTicked: (f) => f.valSameStudy },
      { mode: 'independent', isTicked: (f) => f.valIndependent },
      { mode: 'tcrvdb',      isTicked: (f) => f.valTcrvdb }
    ] },
    { filterId: 'evidence:motif', modes: [
      { mode: 'tcrnet', isTicked: (f) => f.motifTcrnet },
      { mode: 'tcremp', isTicked: (f) => f.motifTcremp }
    ] },
    { filterId: 'evidence:structure', modes: [
      { mode: 'native',   isTicked: (f) => f.structNative },
      { mode: 'contacts', isTicked: (f) => f.structContacts },
      { mode: 'quality',  isTicked: (f) => f.structQuality }
    ] }
  ];

  public setDefault(): void {
    this.minimalConfidenceScore = 0;
    this.nonCanonical = false;
    this.unmapped = false;
    this.valSameStudy = false;
    this.valIndependent = false;
    this.valTcrvdb = false;
    this.motifTcrnet = false;
    this.motifTcremp = false;
    this.structNative = false;
    this.structContacts = false;
    this.structQuality = false;
  }

  public isDefault(): boolean {
    return this.minimalConfidenceScore === 0 &&
      this.nonCanonical === false && this.unmapped === false &&
      this.valSameStudy === false && this.valIndependent === false && this.valTcrvdb === false &&
      this.motifTcrnet === false && this.motifTcremp === false &&
      this.structNative === false && this.structContacts === false && this.structQuality === false;
  }

  public setOptions(_: IFiltersOptions): void {
    return;
  }

  public collectFilters(filters: Filter[], errors: string[]): void {
    if (this.minimalConfidenceScore < this.confidenceScoreMin || this.minimalConfidenceScore > this.confidenceScoreMax) {
      errors.push(`Invalid minimal confidence score value, should be between ${this.confidenceScoreMin} and ${this.confidenceScoreMax}`);
    }
    if (this.minimalConfidenceScore > 0) {
      filters.push(new Filter('vdjdb.score', FilterType.LEVEL, false, this.minimalConfidenceScore.toString()));
    }
    if (this.nonCanonical === false) {
      filters.push(new Filter('web.cdr3fix.nc', FilterType.EXACT, true, 'yes'));
    }
    if (this.unmapped === false) {
      filters.push(new Filter('web.cdr3fix.unmp', FilterType.EXACT, true, 'yes'));
    }

    // One filter per evidence kind, carrying the ticked modes as a comma-separated list. The server
    // ORs within a kind and ANDs between them, so an unticked kind must send nothing at all rather
    // than an empty list - see EvidenceFilters on the backend.
    MetaReliabilityFilter.evidenceKinds.forEach(({ filterId, modes }) => {
      const ticked = modes.filter(({ isTicked }) => isTicked(this)).map(({ mode }) => mode);
      if (ticked.length > 0) {
        filters.push(new Filter(filterId, FilterType.EXACT, false, ticked.join(',')));
      }
    });
  }

  public getFilterId(): string {
    return 'reliability';
  }
}

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

export class SummaryClonotypeCounter {
  public readonly field: string;
  public readonly unique: number;
  public readonly databaseUnique: number;
  public readonly frequency: number;
  public readonly reads: number;
  /** Set on `antigen.epitope` counters only, and absent from the JSON for every other field. The
    * species counters are a sibling breakdown of the same matches, so they cannot say which epitope
    * belongs to which species - only this can. */
  public readonly species: string;
  /** Beta coefficients for this epitope's per-clonotype match rate against a healthy control
    * repertoire, measured server-side. Both are absent unless this is an epitope counter *and* the
    * annotation ran with the filters the control run used - a p-value read against a differently
    * filtered search is wrong in an unknown direction, so their absence means "do not test this bar",
    * not "assume something". */
  public readonly alpha: number;
  public readonly beta: number;

  constructor(counter: any) {
    /* tslint:disable:no-string-literal */
    this.field = counter[ 'field' ];
    this.unique = counter[ 'unique' ];
    this.databaseUnique = counter[ 'databaseUnique' ];
    this.frequency = counter[ 'frequency' ];
    this.reads = counter[ 'reads' ];
    this.species = counter[ 'species' ];
    this.alpha = counter[ 'alpha' ];
    this.beta = counter[ 'beta' ];
    /* tslint:enable:no-string-literal */
  }
}

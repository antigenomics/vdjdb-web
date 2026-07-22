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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { AnnotationsFilters } from 'pages/annotations/filters/annotations-filters';
import { SetEntry } from 'shared/filters/common/set/set-entry';

@Component({
  selector:        'database-query-params',
  templateUrl:     './database-query-params.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DatabaseQueryParamsComponent implements OnInit {
  @Input('filters')
  public filters: AnnotationsFilters;

  @Input('disabled')
  public disabled: boolean;

  /** Every HLA allele the database actually carries, for the donor typing picker. Free text was the
   * whole problem: nothing told you whether what you typed named anything, so a typo and a genuine
   * no-match looked identical, and the only way to find out was to run the annotation. */
  public hlaValues: string[] = [];

  /** The picker is multi-select and the server takes one free-text field, so this is the bridge. */
  public hlaSelected: SetEntry[] = [];

  constructor(private changeDetector: ChangeDetectorRef) {}

  public ngOnInit(): void {
    this.hlaSelected = (this.filters.databaseQueryParams.hla || '')
      .split(',').map((entry) => entry.trim()).filter((entry) => entry.length > 0)
      .map((value) => new SetEntry(value, value, false));
    this.loadHlaValues();
  }

  public onHlaSelectedChange(selected: SetEntry[]): void {
    this.hlaSelected = selected || [];
    // SetEntry.toString drops the disabled entries - the "Search substring: X" row and the truncation
    // notice - and comma-joins the rest, which is exactly what HlaAllele.parseAll on the server reads.
    this.filters.databaseQueryParams.hla = SetEntry.toString(this.hlaSelected);
  }

  public isDisabled() {
    return this.disabled ? true : undefined;
  }

  /** Both MHC chain columns, because a class II donor allele can be typed into either: DRA sits in
   * `mhc.a` and DRB1 in `mhc.b`. Non-human and non-allele values (`B2M`, `H-2Kb`, `Mamu-A*01`) are
   * dropped - the server will never match them against a human donor typing, so offering them would
   * only invite a selection that quietly returns nothing.
   *
   * Plain `fetch` and a swallowed failure, matching the demo-sample listing elsewhere in this page:
   * this app has never wired up HttpClient, and the picker degrades to accepting typed text, which
   * is exactly what it did before.
   */
  private loadHlaValues(): void {
    Promise.all([ 'mhc.a', 'mhc.b' ].map((column) =>
      fetch(`/api/database/meta/columns/${encodeURIComponent(column)}`)
        .then((response) => response.ok ? response.json() : undefined)
        .then((body) => (body && body.column && body.column.values) as string[] || [])
        .catch(() => [] as string[])
    )).then((columns) => {
      const alleles = columns
        .reduce((acc, values) => acc.concat(values), [] as string[])
        .map((value) => (value || '').trim())
        .filter((value) => value.toUpperCase().startsWith('HLA-'));
      this.hlaValues = Array.from(new Set(alleles)).sort();
      this.changeDetector.detectChanges();
    }).catch(() => undefined);
  }
}

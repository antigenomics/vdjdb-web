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

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { SummaryClonotypeCounter } from 'pages/annotations/sample/table/intersection/summary/summary-clonotype-counter';

export interface IThresholdType {
  title: string;
  threshold: number;
}

export interface INormalizeType {
  name: string;
  title: string;
  checked: boolean;
}

export interface ISummaryFilterFieldType {
  name: string;
  title: string;
}

export interface ISummaryChartOptionsDisableCheckboxes {
  disableIsNotFoundVisible: boolean;
  disableIsWeightedByReadCount: boolean;
}

export class SummaryChartOptions {
  public static readonly thresholdTypes: IThresholdType[] = [
    { title: 'All', threshold: 10000 },
    { title: 'Top 5', threshold: 5 },
    { title: 'Top 10', threshold: 10 },
    { title: 'Top 15', threshold: 15 },
    { title: 'Top 20', threshold: 20 },
    { title: 'Top 25', threshold: 25 },
    { title: 'Top 30', threshold: 30 }
  ];

  /** `matches` and `sample` are two different denominators for the same axis - the matched subset, or
    * the repertoire it was drawn from - so they are mutually exclusive; see `normalizeTypeChangeFn`.
    *
    * `db` and `sample` are on by default because together they are the quantity that actually compares
    * across samples and across epitopes: w x intersection / |VDJdb records| / |clonotypes in sample|,
    * where w is the summed frequency when weighting by read count and 1 otherwise. Raw match counts
    * favour whichever epitope happens to be best represented in the database and whichever sample was
    * sequenced deepest, which is rarely the question being asked. */
  public normalizeTypes: INormalizeType[] = [
    { name: 'db', title: 'number of corresponding VDJdb records', checked: true },
    { name: 'matches', title: 'number of matched clonotypes in sample', checked: false },
    { name: 'sample', title: 'total number of clonotypes in sample', checked: true }
  ];

  public fieldTypes: ISummaryFilterFieldType[] = [
    { name: 'antigen.epitope', title: 'Epitope' },
    { name: 'mhc.class', title: 'MHC class' },
    { name: 'mhc.a', title: 'MHC A' },
    { name: 'mhc.b', title: 'MHC B' },
    { name: 'mhc.locus', title: 'HLA locus' },
    { name: 'antigen.species', title: 'Epitope species' },
    { name: 'antigen.gene', title: 'Epitope gene' }
  ];

  /** Epitopes the database holds fewer than this many distinct CDR3s for are left off the plot.
    *
    * A display threshold, applied here rather than server-side. It used to be sent with the annotate
    * request and applied while building the summary, which meant a control described as affecting the
    * plots only could not be changed without re-running the whole annotation - and it silently applied
    * to the single-sample charts but never to the multisample ones.
    */
  public minEpitopeSize: number = 10;

  /** Both size denominators are per 10^5, not per 1.
    *
    * A repertoire holds ~10^5 clonotypes and VDJdb holds ~10^5 records per well-studied epitope, so
    * dividing by either drives the plotted value to ~10^-5 and by both to ~10^-10 - an axis of
    * `0.000000010` that no reader can compare at a glance. Scaling each denominator back by 10^5 puts
    * the axis in single digits without changing a single ratio between bars. The label under the
    * checkboxes names the resulting unit; the number on the axis is meaningless without it. */
  public static readonly normalizeScale: number = 1e5;

  public currentThresholdType: IThresholdType = SummaryChartOptions.thresholdTypes[ 0 ];
  public currentFieldIndex: number = 0;
  public isNotFoundVisible: boolean = false;
  public isWeightedByReadCount: boolean = true;

  /**
   * The counters worth plotting for a column.
   *
   * `databaseUnique` is how many distinct CDR3s VDJdb holds for that value, which is exactly what
   * "epitope size" meant when this was applied server-side. Only the epitope column is thinned - the
   * cutoff is meaningless against an MHC class or a species.
   */
  public static charted(counters: SummaryClonotypeCounter[], fieldName: string,
                        options: SummaryChartOptions): SummaryClonotypeCounter[] {
    if (fieldName !== 'antigen.epitope' || options.minEpitopeSize <= 0) {
      return counters;
    }
    return counters.filter((c) => c.databaseUnique >= options.minEpitopeSize);
  }

  public getCurrentSummaryFilterFieldType(): ISummaryFilterFieldType {
    return this.fieldTypes[ this.currentFieldIndex ];
  }

  /** What one unit on the value axis means under the current denominators, or '' when none apply.
    * Only the two size denominators are scaled - dividing by the matched subset yields a fraction of
    * order 1 that needs no help. */
  public getNormalizeUnits(): string {
    const parts = this.normalizeTypes
      .filter((t) => t.checked)
      .map((t) => t.name === 'matches' ? 'matched clonotype' : `10⁵ ${t.name === 'db' ? 'VDJdb records' : 'sample clonotypes'}`);
    return parts.length === 0 ? '' : `per ${parts.join(' per ')}`;
  }

  public updateCurrentThresholdType(availableThresholdTypes: number): void {
    this.currentThresholdType = SummaryChartOptions.thresholdTypes[ availableThresholdTypes - 1 ];
  }
}

@Component({
  selector:        'summary-chart-options',
  templateUrl:     './summary-chart-options.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryChartOptionsComponent {
  private thresholdTypesAvailable: number = -1;

  @Input('options')
  public options: SummaryChartOptions;

  @Input('disableCheckboxes')
  public disableCheckboxes: ISummaryChartOptionsDisableCheckboxes = { disableIsNotFoundVisible: false, disableIsWeightedByReadCount: false };

  @Output('onOptionsChange')
  public onOptionsChange = new EventEmitter();

  @Input('threshold')
  public set threshold(threshold: number) {
    this.thresholdTypesAvailable = threshold;
    this.options.updateCurrentThresholdType(threshold);
  }

  public get isNotFoundVisible(): boolean {
    return this.options.isNotFoundVisible;
  }

  public set isNotFoundVisible(isVisible: boolean) {
    this.options.isNotFoundVisible = isVisible;
    this.onOptionsChange.emit(this.options);
  }

  public get minEpitopeSize(): number {
    return this.options.minEpitopeSize;
  }

  public set minEpitopeSize(size: number) {
    // Guard the parse: an emptied number input yields null, which would compare false against every
    // count and blank the chart.
    this.options.minEpitopeSize = (size === null || isNaN(size) || size < 0) ? 0 : size;
    this.onOptionsChange.emit(this.options);
  }

  public getNormalizeUnits(): string {
    return this.options.getNormalizeUnits();
  }

  public isEpitopeFieldSelected(): boolean {
    return this.options.fieldTypes[ this.options.currentFieldIndex ].name === 'antigen.epitope';
  }

  public get isWeightedByReadCount(): boolean {
    return this.options.isWeightedByReadCount;
  }

  public set isWeightedByReadCount(isWeighted: boolean) {
    this.options.isWeightedByReadCount = isWeighted;
    this.onOptionsChange.emit(this.options);
  }

  // Normalize type methods
  /** Names of the two denominators that cannot both apply: dividing by the matched subset and by the
    * whole repertoire at once produces a number that is neither. */
  private static readonly exclusiveNormalizeTypes: string[] = [ 'matches', 'sample' ];

  public normalizeTypeChangeFn(checked: boolean, type: INormalizeType): void {
    type.checked = checked;
    if (checked && SummaryChartOptionsComponent.exclusiveNormalizeTypes.indexOf(type.name) !== -1) {
      this.options.normalizeTypes
        .filter((other) => other !== type && SummaryChartOptionsComponent.exclusiveNormalizeTypes.indexOf(other.name) !== -1)
        .forEach((other) => other.checked = false);
    }
    this.onOptionsChange.emit(this.options);
  }

  // Field methods
  public getCurrentFieldTitle(): string {
    return this.options.fieldTypes[ this.options.currentFieldIndex ].title;
  }

  public getSummaryFilterFields(): ISummaryFilterFieldType[] {
    return this.options.fieldTypes;
  }

  public setCurrentSummaryFilterField(index: number): void {
    this.options.currentFieldIndex = index;
    this.onOptionsChange.emit(this.options);
  }

  // Threshold methods
  public trackThresholdFn(_index: number, threshold: IThresholdType) {
    return threshold.threshold;
  }

  public isThresholdTypesAvailable(): boolean {
    return this.thresholdTypesAvailable > 1;
  }

  public getThresholdTypes(): IThresholdType[] {
    return SummaryChartOptions.thresholdTypes.slice(0, this.thresholdTypesAvailable);
  }

  public getCurrentThresholdTypeTitle(): string {
    return this.options.currentThresholdType.title;
  }

  public setThreshold(threshold: IThresholdType): void {
    this.options.currentThresholdType = threshold;
    this.onOptionsChange.emit(this.options);
  }
}

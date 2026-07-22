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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import {
  IMultisampleSummaryAnalysisTab,
  IMultisampleSummaryAnalysisTabState,
  MultisampleSummaryService,
  MultisampleSummaryServiceEvents
} from 'pages/annotations/multisample/summary/multisample-summary.service';
import { ISummaryChartOptionsDisableCheckboxes, SummaryChartOptions } from 'pages/annotations/sample/chart/summary/options/summary-chart-options.component';
import { SummaryClonotypeCounter } from 'pages/annotations/sample/table/intersection/summary/summary-clonotype-counter';
import { SummaryCounters } from 'pages/annotations/sample/table/intersection/summary/summary-counters';
import { ReplaySubject, Subscription } from 'rxjs';
import { IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { ChartGroupedStreamType } from 'shared/charts/chart';
import { ChartUtils } from 'shared/charts/chart-utils';
import { ChartEventType } from 'shared/charts/chart-events';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';
import { IChartGroupedDataEntry } from 'shared/charts/data/chart-grouped-data-entry';
import { Statistics } from 'utils/statistics/statistics';
import { Utils } from 'utils/utils';

@Component({
  selector:        'multisample-summary-chart',
  templateUrl:     './multisample-summary-chart.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultisampleSummaryChartComponent implements OnInit, OnDestroy {
  private resizeWindowListener: () => void;
  private resizeDebouncedHandler = Utils.Time.debounce(() => {
    this.updateStream(ChartEventType.RESIZE, this.currentTab.options);
  });

  private multisampleSummaryServiceEventsSubscription: Subscription;
  private currentTab: IMultisampleSummaryAnalysisTab;
  private thresholdTypesAvailable: number = -1;
  private colorByTags: boolean = false;
  private orderBySamples: boolean = true;
  private showOnlyShared: boolean = false;
  private useLogScale: boolean = false;
  /** On by default, and the epitope column is the default column, so the first thing drawn already
    * groups its bars by antigen. Without it a wall of epitope bars carries no structure at all - the
    * spectral ramp only encodes rank, which the sort already shows. */
  private colorBySpecies: boolean = true;

  private plottedSpecies: Set<string> = new Set();

  private static readonly EpitopeField: string = 'antigen.epitope';

  public barChartConfiguration: IBarChartConfiguration = MultisampleSummaryChartComponent.configurationFor(false);

  @Input('tab')
  public set updateTab(tab: IMultisampleSummaryAnalysisTab) {
    this.currentTab = tab;
    this.updateStream(ChartEventType.UPDATE_DATA, this.currentTab.options);
  }

  public stream: ChartGroupedStreamType = new ReplaySubject(1);

  public get threshold(): number {
    return this.thresholdTypesAvailable;
  }

  public get tagsColors(): boolean {
    return this.colorByTags;
  }

  public set tagsColors(byTags: boolean) {
    this.colorByTags = byTags;
    this.updateStream(ChartEventType.UPDATE_DATA, this.currentTab.options);
  }

  public get order(): boolean {
    return this.orderBySamples;
  }

  public set order(order: boolean) {
    this.orderBySamples = order;
    this.updateStream(ChartEventType.UPDATE_DATA, this.currentTab.options);
  }

  public get speciesColors(): boolean {
    return this.colorBySpecies;
  }

  public set speciesColors(bySpecies: boolean) {
    this.colorBySpecies = bySpecies;
    this.updateStream(ChartEventType.UPDATE_DATA, this.currentTab.options);
  }

  /** Only the epitope breakdown carries a species per bar; every other column's values span species. */
  public isSpeciesColoringAvailable(): boolean {
    return this.currentTab.options.getCurrentSummaryFilterFieldType().name === MultisampleSummaryChartComponent.EpitopeField;
  }

  /** The species drawn on the plot as it currently stands, with the colour each is drawn in.
    *
    * Collected by `createData` from the bars it actually emitted rather than recomputed here, so
    * everything that narrows the plot narrows the key with it. Recomputing was listing every species
    * in the tab: it re-applied the epitope cutoff but knew nothing of the "Top N" slice, so a Top 5
    * chart showing five epitopes came with a legend of seventeen viruses, most of them for bars that
    * were not on screen. Colours still come from the tab-wide palette, so a species keeps its colour
    * as the threshold moves. */
  public getSpeciesLegend(): Array<{ name: string, color: string }> {
    if (!this.colorBySpecies || !this.isSpeciesColoringAvailable()) {
      return [];
    }
    const palette = this.speciesPalette();
    return Array.from(this.plottedSpecies).sort().map((name) => ({ name, color: palette[ name ] }));
  }

  public get logarithmic(): boolean {
    return this.useLogScale;
  }

  public set logarithmic(log: boolean) {
    this.useLogScale = log;
    // A NEW object, not an edit to the existing one: the chart holds its own copy of the configuration
    // it was built with, and only a changed input reference makes it take another.
    this.barChartConfiguration = MultisampleSummaryChartComponent.configurationFor(log);
    this.updateStream(ChartEventType.UPDATE_DATA, this.currentTab.options);
  }

  public get shared(): boolean {
    return this.showOnlyShared;
  }

  public set shared(shared: boolean) {
    this.showOnlyShared = shared;
    this.updateStream(ChartEventType.UPDATE_DATA, this.currentTab.options);
  }

  constructor(private multisampleSummaryService: MultisampleSummaryService, private renderer: Renderer2,
              private changeDetector: ChangeDetectorRef) {
  }

  public ngOnInit(): void {
    this.resizeWindowListener = this.renderer.listen('window', 'resize', this.resizeDebouncedHandler);
    this.multisampleSummaryServiceEventsSubscription = this.multisampleSummaryService.getEvents().subscribe((event) => {
      if (event === MultisampleSummaryServiceEvents.CURRENT_TAB_UPDATED
        && this.multisampleSummaryService.getCurrentTabState() === IMultisampleSummaryAnalysisTabState.COMPLETED) {
        this.updateStream(ChartEventType.UPDATE_DATA, this.currentTab.options);
      }
    });
  }

  public getCurrentTabSummaryChartOptions(): SummaryChartOptions {
    return this.currentTab.options;
  }

  public getCurrentTabSummaryChartDisableCheckboxesOptions(): ISummaryChartOptionsDisableCheckboxes {
    return { disableIsNotFoundVisible: !this.orderBySamples, disableIsWeightedByReadCount: false };
  }

  public getCurrentTabProcessedSamples(): string[] {
    return Array.from(this.currentTab.counters.keys());
  }

  public toggleSampleHidden(sample: string): void {
    const index = this.currentTab.hiddenSamples.indexOf(sample);
    if (index === -1) {
      this.currentTab.hiddenSamples.push(sample);
    } else {
      this.currentTab.hiddenSamples.splice(index, 1);
    }
    this.updateStream(ChartEventType.UPDATE_DATA, this.currentTab.options);
  }

  public isSampleHidden(sample: string): boolean {
    return this.currentTab.hiddenSamples.indexOf(sample) !== -1;
  }

  /** True when the sample contributes no bar under the current column and cutoff, so `createData`
    * gives it no panel. Its chip in "Hide samples" would otherwise be a control that does nothing:
    * the sample is already off the chart and toggling it cannot bring it back. Only meaningful while
    * ordering by samples - the other layout plots columns, not samples. */
  public isSampleEmpty(sample: string): boolean {
    if (!this.orderBySamples) {
      return false;
    }
    const options = this.currentTab.options;
    const fieldName = options.getCurrentSummaryFilterFieldType().name;
    const counters = this.currentTab.counters.get(sample);
    const field = counters ? counters.counters.find((c) => c.name === fieldName) : undefined;
    return field === undefined || SummaryChartOptions.charted(field.counters, fieldName, options).length === 0;
  }

  public getNonHiddenSamplesCount(samples: string[]): number {
    return samples.filter((s) => !this.isSampleHidden(s)).length;
  }

  public handleChangeOptionsFn(options: SummaryChartOptions): void {
    this.updateStream(ChartEventType.UPDATE_DATA, options);
  }

  public ngOnDestroy(): void {
    this.resizeWindowListener();
    this.multisampleSummaryServiceEventsSubscription.unsubscribe();
  }

  private updateStream(type: ChartEventType, options: SummaryChartOptions): void {
    // Order matters. `updateThresholdValues` has to run first because it settles which "Top N" is in
    // force, and `createData` slices against that. It also detects changes, which is too early for the
    // legend - that is only known once `createData` has emitted the bars - hence the second pass below.
    this.updateThresholdValues();
    this.stream.next({ type, data: this.createData(options) });
    this.changeDetector.detectChanges();
  }

  private createData(options: SummaryChartOptions): IChartGroupedDataEntry[] {
    const currentCounterFieldName = options.getCurrentSummaryFilterFieldType().name;
    let data: IChartGroupedDataEntry[] = [];

    // Built once per update, not per bar: the palette spans the whole tab, so recomputing it inside
    // the loops would redo the same scan for every epitope of every sample.
    const speciesPalette = (this.colorBySpecies && this.isSpeciesColoringAvailable()) ? this.speciesPalette() : undefined;
    const speciesColor = (c: SummaryClonotypeCounter): string =>
      (speciesPalette !== undefined && c.species) ? speciesPalette[ c.species ] : undefined;
    // Enrichment per sample, over every value that survived the cutoff - the whole family that was
    // tested, not just the slice on screen, or the BH correction would be against the wrong m.
    const enrichment = this.enrichmentBySample(currentCounterFieldName, options);

    // The species line shows whether or not the bars are coloured by it: the colouring is a display
    // choice, but which antigen an epitope belongs to is a fact about the bar either way. The
    // enrichment lines are counts of clonotypes, so neither the read-count weighting nor the axis
    // scaling touches them - those change how tall a bar is drawn, not how unlikely it is.
    const notesFor = (c: SummaryClonotypeCounter, sample: string): string[] => {
      const lines: string[] = [];
      if (c.species) {
        lines.push(`Species: ${c.species}`);
      }
      const test = enrichment[ sample ] !== undefined ? enrichment[ sample ][ c.field ] : undefined;
      if (test !== undefined) {
        lines.push(`P-value = ${Statistics.formatPValue(test.p)}`);
        lines.push(`P-adj (BH) = ${Statistics.formatPValue(test.q)}`);
      }
      return lines;
    };

    // Takes the counters it belongs to, because the "total number of clonotypes in sample"
    // denominator is per sample - the whole point of this chart is that the samples differ.
    const valueConverter: (c: SummaryClonotypeCounter, owner: SummaryCounters) => number = (c, owner) => {
      let value = (options.isWeightedByReadCount ? c.frequency : c.unique);
      if (options.normalizeTypes[ 0 ].checked && c.databaseUnique > 0) { // db
        value = value / c.databaseUnique * SummaryChartOptions.normalizeScale;
      }
      if (options.normalizeTypes[ 1 ].checked && c.unique > 0) { // matches
        value = value / c.unique;
      }
      if (options.normalizeTypes[ 2 ].checked) { // whole sample
        const sampleSize = owner.annotated.unique + owner.notFoundCounter.unique;
        if (sampleSize > 0) {
          value = value / sampleSize * SummaryChartOptions.normalizeScale;
        }
      }
      return value;
    };

    if (this.orderBySamples) {
      this.currentTab.counters.forEach((value: SummaryCounters, key: string) => {
        if (!this.isSampleHidden(key)) {
          const counters = value.counters.find((c) => c.name === currentCounterFieldName);
          let values = SummaryChartOptions.charted(counters.counters, currentCounterFieldName, options)
            .map((c) => ({
              name: c.field, value: valueConverter(c, value), color: speciesColor(c), notes: notesFor(c, key)
            } as IChartDataEntry))
            .sort((a, b) => b.value - a.value);
          if (values.length > options.currentThresholdType.threshold) {
            values = values.slice(0, options.currentThresholdType.threshold);
          }
          // A sample with nothing to plot gets no panel. A repertoire of the other chain matches no
          // VDJdb record at all, and it stayed on the axis as an empty column for as long as it was in
          // the tab - squeezing every sample that did match into the remaining width.
          if (values.length !== 0) {
            if (options.isNotFoundVisible) {
              values.push({ name: 'Unannotated', value: valueConverter(value.notFoundCounter, value), color: 'rgba(40, 40, 40, 0.5)' });
            }
            data.push({ name: key, values });
          }
        }
      });
    } else {
      const fieldValues: Set<string> = new Set();
      this.currentTab.counters.forEach((summaryCounter: SummaryCounters) => {
        const fieldCounters = summaryCounter.counters.find((c) => c.name === currentCounterFieldName);
        SummaryChartOptions.charted(fieldCounters.counters, currentCounterFieldName, options)
          .forEach((counter: SummaryClonotypeCounter) => {
            fieldValues.add(counter.field);
          });
      });

      Array.from(fieldValues.values()).forEach((value) => {
        const entries: IChartDataEntry[] = [];

        Array.from(this.currentTab.counters.entries()).forEach((entry: [ string, SummaryCounters ]) => {
          const [ sample, summaryCounters ] = entry;
          if (!this.isSampleHidden(sample)) {
            const counters = summaryCounters.counters.find((c) => c.name === currentCounterFieldName);
            const index = counters.counters.map((c) => c.field).indexOf(value);
            if (index !== -1) {
              // Species wins over tags: it is the more specific statement, and a bar cannot carry both.
              let color: string = speciesColor(counters.counters[ index ]);
              if (color === undefined && this.colorByTags) {
                color = this.multisampleSummaryService.getSampleTagColor(sample);
              }
              entries.push({
                name: sample, value: valueConverter(counters.counters[ index ], summaryCounters), color,
                notes: notesFor(counters.counters[ index ], sample)
              });
            }
          }
        });

        data.push({ name: value, values: entries });
      });

      if (this.showOnlyShared) {
        const nonHiddenSamplesCount = this.getNonHiddenSamplesCount(Array.from(this.currentTab.counters.keys()));
        data = data.filter((d) => d.values.length === nonHiddenSamplesCount);
      }

      const reducer = (previous: number, current: IChartDataEntry) => {
        return previous + current.value;
      };

      data = data.sort((a, b) => {
        const aSummary = a.values.reduce(reducer, 0.0);
        const bSummary = b.values.reduce(reducer, 0.0);

        return bSummary - aSummary;
      });

      if (data.length > options.currentThresholdType.threshold) {
        data = data.slice(0, options.currentThresholdType.threshold);
      }
    }

    this.recordPlottedSpecies(data);
    return data;
  }

  /** Which species survived every narrowing - the cutoff, the "Top N" slice, hidden samples, "shared
    * only" - read off the finished data rather than recomputed from the counters, which is the only
    * way the key can be guaranteed to describe the picture beside it.
    *
    * Both layouts in one pass: ordering by samples puts epitopes on the inner axis and samples on the
    * group, the other way round puts epitopes on the group and samples inside. A name that is not an
    * epitope simply misses the map. */
  private recordPlottedSpecies(data: IChartGroupedDataEntry[]): void {
    const map = this.epitopeSpecies();
    const seen = new Set<string>();
    data.forEach((group) => {
      const groupSpecies = map[ group.name ];
      if (groupSpecies) {
        seen.add(groupSpecies);
      }
      group.values.forEach((entry) => {
        const entrySpecies = map[ entry.name ];
        if (entrySpecies) {
          seen.add(entrySpecies);
        }
      });
    });
    this.plottedSpecies = seen;
  }

  private updateThresholdValues(): void {
    this.thresholdTypesAvailable = 1;

    if (this.orderBySamples) {
      const currentFieldName: string = this.currentTab.options.getCurrentSummaryFilterFieldType().name;
      this.currentTab.counters.forEach((value: SummaryCounters) => {
        let localThresholdTypesAvailable = 1;
        const counters = value.counters.find((c) => c.name === currentFieldName);
        if (counters) {
          // Against the thinned list, so "Top 20" offers itself only when twenty bars survive the cutoff.
          const charted = SummaryChartOptions.charted(counters.counters, currentFieldName, this.currentTab.options);
          for (const type of SummaryChartOptions.thresholdTypes) {
            if (charted.length > type.threshold) {
              localThresholdTypesAvailable += 1;
            }
          }
        }
        this.thresholdTypesAvailable = Math.max(this.thresholdTypesAvailable, localThresholdTypesAvailable);
      });
    } else {
      this.thresholdTypesAvailable = SummaryChartOptions.thresholdTypes.length;
    }

    this.changeDetector.detectChanges();
  }

  /**
   * Beta-Binomial enrichment per sample, keyed sample -> field value -> { p, q }.
   *
   *   `a ~ BetaBinomial(b, alpha, beta)`
   *
   *   a  clonotypes matching this epitope in the sample
   *   b  clonotypes in the sample
   *   alpha, beta  the epitope's per-clonotype match rate in a healthy control repertoire
   *
   * The coefficients come from the server, measured by annotating a 100k-clonotype control repertoire
   * of the same species and chain — see `ControlPrior` — so the question each p-value answers is "more
   * of this epitope than a repertoire with no history of it", which is the question being asked.
   *
   * What it replaces was the epitope's share of VDJdb records, and that was measuring the database
   * rather than the donor. Record count is close to unrelated to how reachable an epitope is: on
   * production `YLEPGPVTA` has 11 human TRB records and a control repertoire finds it 217 times, while
   * `EPLPQGQLTAY` has 39 records and is found 42 times. Scoring a real B35+ donor against record share
   * ranked `YLEPGPVTA` first at 1e-37 and the donor's true EBV response fifteenth; against the control
   * the true response ranks first and `YLEPGPVTA` comes out at p = 1.00 — the donor matched it 67
   * times where chance alone gives 139, so it was never enriched, only reachable.
   *
   * Beta-Binomial rather than Binomial because the rate is itself estimated from one finite control, so
   * it carries uncertainty that a fixed `p` would throw away. The half-count in `alpha` and `beta` is
   * Jeffreys, and it is what keeps the rare tail honest: an epitope reached zero times out of 100,000
   * has a maximum-likelihood rate of exactly zero, under which one single match is infinitely
   * surprising and every never-reached epitope would top the chart.
   *
   * Every input is a count of distinct rearrangements. Neither the read-count weighting nor the axis
   * scaling can reach this — both change how tall a bar is drawn, not how unlikely it is.
   *
   * BH runs per sample over every value that passed the epitope cutoff — each sample is its own
   * experiment, and the family is what was tested rather than what the threshold left on screen.
   */
  private enrichmentBySample(fieldName: string, options: SummaryChartOptions):
    { [ sample: string ]: { [ value: string ]: { p: number, q: number } } } {

    const result: { [ sample: string ]: { [ value: string ]: { p: number, q: number } } } = {};

    this.currentTab.counters.forEach((counters: SummaryCounters, sample: string) => {
      const field = counters.counters.find((c) => c.name === fieldName);
      if (!field) {
        return;
      }
      const sampleClonotypes = counters.annotated.unique + counters.notFoundCounter.unique;   // b
      const tested = SummaryChartOptions.charted(field.counters, fieldName, options);

      const pValues = tested.map((counter) => {
        // No coefficients means the server did not measure this bar — a non-epitope column, a species
        // or chain the control set does not cover, or an annotation run with filters the control run
        // did not use. All three are "unknown", and a bar with no null behind it gets no p-value
        // rather than one computed against a substitute.
        if (sampleClonotypes <= 0 || counter.alpha === undefined || counter.beta === undefined) {
          return NaN;
        }
        return Statistics.betaBinomialUpperTail(counter.unique, sampleClonotypes, counter.alpha, counter.beta);
      });
      const adjusted = Statistics.benjaminiHochberg(pValues);

      const perValue: { [ value: string ]: { p: number, q: number } } = {};
      tested.forEach((c, i) => { perValue[ c.field ] = { p: pValues[ i ], q: adjusted[ i ] }; });
      result[ sample ] = perValue;
    });

    return result;
  }

  /** epitope -> antigen species, over every epitope counter in the tab. One map serves the palette,
    * the bar colours, the tooltip line and the legend, so none of them can disagree about which
    * antigen an epitope belongs to. */
  private epitopeSpecies(): { [ epitope: string ]: string } {
    const fieldName = MultisampleSummaryChartComponent.EpitopeField;
    const map: { [ epitope: string ]: string } = {};
    this.currentTab.counters.forEach((counters: SummaryCounters) => {
      const field = counters.counters.find((c) => c.name === fieldName);
      if (field) {
        field.counters.forEach((c) => { if (c.species) { map[ c.field ] = c.species; } });
      }
    });
    return map;
  }

  /** species -> colour, over every species in the tab, sorted so the assignment is stable across
    * updates. Keyed on the whole tab rather than what is plotted so a colour does not move when the
    * threshold or the cutoff changes what is on screen. */
  private speciesPalette(): { [ species: string ]: string } {
    const map = this.epitopeSpecies();
    const names = Array.from(new Set(Object.keys(map).map((epitope) => map[ epitope ]))).sort();
    const colors = ChartUtils.Color.spread(names.length);
    const palette: { [ species: string ]: string } = {};
    names.forEach((name, i) => { palette[ name ] = colors[ i ]; });
    return palette;
  }

  private static configurationFor(log: boolean): IBarChartConfiguration {
    return {
      grid:      true,
      container: { margin: { left: 60, right: 25, top: 100, bottom: 100 } },
      tooltip:   { value: MultisampleSummaryChartComponent.tooltipValueFn },
      axis:      { y: { log } }
    };
  }

  private static tooltipValueFn(d: IChartDataEntry): string {
    return d.value.toExponential(3);
  }
}

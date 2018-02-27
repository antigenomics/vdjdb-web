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

import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import {
    IMultisampleSummaryAnalysisTab, IMultisampleSummaryAnalysisTabState, MultisampleSummaryService,
    MultisampleSummaryServiceEvents
} from 'pages/annotations/multisample/summary/multisample-summary.service';
import { SummaryChartOptions } from 'pages/annotations/sample/chart/summary/options/summary-chart-options.component';
import { SummaryClonotypeCounter } from 'pages/annotations/sample/table/intersection/summary/summary-clonotype-counter';
import { SummaryCounters } from 'pages/annotations/sample/table/intersection/summary/summary-counters';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subscription } from 'rxjs/Subscription';
import { IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { ChartGroupedStreamType } from 'shared/charts/chart';
import { ChartEventType } from 'shared/charts/chart-events';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';
import { IChartGroupedDataEntry } from 'shared/charts/data/chart-grouped-data-entry';
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

    public barChartConfiguration: IBarChartConfiguration = {
        grid:      true,
        container: { margin: { left: 60, right: 25, top: 20, bottom: 100 } }
    };

    @Input('tab')
    public set updateTab(tab: IMultisampleSummaryAnalysisTab) {
        this.currentTab = tab;
        this.updateStream(ChartEventType.UPDATE_DATA, this.currentTab.options);
    }

    public stream: ChartGroupedStreamType = new ReplaySubject(1);

    public get threshold(): number {
        return this.thresholdTypesAvailable;
    }

    constructor(private multisampleSummaryService: MultisampleSummaryService, private renderer: Renderer2) {
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

    public handleChangeOptionsFn(options: SummaryChartOptions): void {
        this.updateStream(ChartEventType.UPDATE_DATA, options);
    }

    public ngOnDestroy(): void {
        this.resizeWindowListener();
        this.multisampleSummaryServiceEventsSubscription.unsubscribe();
    }

    private updateStream(type: ChartEventType, options: SummaryChartOptions): void {
        this.updateThresholdValues();
        this.stream.next({ type, data: this.createData(options) });
    }

    private createData(options: SummaryChartOptions): IChartGroupedDataEntry[] {
        const data: IChartGroupedDataEntry[] = [];
        const currentCounterFieldName = options.getCurrentSummaryFilterFieldType().name;

        const valueConverter: (c: SummaryClonotypeCounter) => number = (c) => {
            let value = (options.isWeightedByReadCount ? c.frequency : c.unique);
            if (options.normalizeTypes[ 0 ].checked) { // db
                value = value / c.databaseUnique;
            }
            if (options.normalizeTypes[ 1 ].checked) { // matches
                value = value / c.unique;
            }
            return value;
        };

        this.currentTab.counters.forEach((value: SummaryCounters, key: string) => {
            if (!this.isSampleHidden(key)) {
                const counters = value.counters.find((c) => c.name === currentCounterFieldName);
                let values = counters.counters.map((c) => ({ name: c.field, value: valueConverter(c) } as IChartDataEntry)).sort((a, b) => {
                    return b.value - a.value;
                });
                if (values.length > options.currentThresholdType.threshold) {
                    values = values.slice(0, options.currentThresholdType.threshold);
                }
                if (options.isNotFoundVisible) {
                    values.push({ name: 'Unannotated', value: valueConverter(value.notFoundCounter), color: 'rgba(40, 40, 40, 0.5)' });
                }
                if (counters) {
                    data.push({ name: key, values: values.reverse() });
                }
            }
        });

        return data;
    }

    private updateThresholdValues(): void {
        this.thresholdTypesAvailable = 1;
        const currentFieldName: string = this.currentTab.options.getCurrentSummaryFilterFieldType().name;
        this.currentTab.counters.forEach((value: SummaryCounters) => {
            let localThresholdTypesAvailable = 1;
            const counters = value.counters.find((c) => c.name === currentFieldName);
            if (counters) {
                for (let i = 1; i < SummaryChartOptions.thresholdTypes.length; ++i) {
                    if (counters.counters.length > SummaryChartOptions.thresholdTypes[ i ].threshold) {
                        localThresholdTypesAvailable += 1;
                    }
                }
            }
            this.thresholdTypesAvailable = Math.max(this.thresholdTypesAvailable, localThresholdTypesAvailable);
        });
    }
}

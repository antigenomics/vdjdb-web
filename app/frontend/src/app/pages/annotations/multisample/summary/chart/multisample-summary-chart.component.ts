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

import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import {
    IMultisampleSummaryAnalysisTab, IMultisampleSummaryAnalysisTabState, MultisampleSummaryService,
    MultisampleSummaryServiceEvents
} from 'pages/annotations/multisample/summary/multisample-summary.service';
import { SummaryCounters } from 'pages/annotations/sample/table/intersection/summary/summary-counters';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subscription } from 'rxjs/Subscription';
import { IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { ChartGroupedStreamType } from 'shared/charts/chart';
import { ChartEventType } from 'shared/charts/chart-events';
import { IChartGroupedDataEntry } from 'shared/charts/data/chart-grouped-data-entry';

@Component({
    selector:        'multisample-summary-chart',
    templateUrl:     './multisample-summary-chart.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultisampleSummaryChartComponent implements OnInit, OnDestroy {
    private multisampleSummaryServiceEventsSubscription: Subscription;
    private currentTab: IMultisampleSummaryAnalysisTab;

    public barChartConfiguration: IBarChartConfiguration = {
        grid:      true,
        container: { margin: { left: 25, right: 25, top: 20, bottom: 100 } }
    };

    @Input('tab')
    public set updateTab(tab: IMultisampleSummaryAnalysisTab) {
        this.currentTab = tab;
        this.updateStream(ChartEventType.UPDATE_DATA);
    }

    public stream: ChartGroupedStreamType = new ReplaySubject(1);

    constructor(private multisampleSummaryService: MultisampleSummaryService) {}

    public ngOnInit(): void {
        this.multisampleSummaryServiceEventsSubscription = this.multisampleSummaryService.getEvents().subscribe((event) => {
            if (event === MultisampleSummaryServiceEvents.CURRENT_TAB_UPDATED
                && this.multisampleSummaryService.getCurrentTabState() === IMultisampleSummaryAnalysisTabState.COMPLETED) {
                this.updateStream(ChartEventType.UPDATE_DATA);
            }
        });
    }

    public ngOnDestroy(): void {
        this.multisampleSummaryServiceEventsSubscription.unsubscribe();
    }

    private updateStream(type: ChartEventType): void {
        this.stream.next({ type, data: this.createData() });
    }

    private createData(): IChartGroupedDataEntry[] {
        if (this.currentTab === undefined) {
            return [];
        }

        const data: IChartGroupedDataEntry[] = [];
        this.currentTab.counters.forEach((value: SummaryCounters, key: string) => {
            data.push({
                name:   key,
                values: value.counters[ 0 ].counters.map((c) => ({ name: c.field, value: c.unique }))
            });
        });

        return data;
    }
}

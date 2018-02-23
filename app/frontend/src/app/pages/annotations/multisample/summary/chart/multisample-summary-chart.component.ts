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

import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IMultisampleSummaryAnalysisTab } from 'pages/annotations/multisample/summary/multisample-summary.service';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { ChartGroupedStreamType } from 'shared/charts/chart';
import { ChartEventType } from 'shared/charts/chart-events';
import { IChartGroupedDataEntry } from 'shared/charts/data/chart-grouped-data-entry';

@Component({
    selector:        'multisample-summary-chart',
    templateUrl:     './multisample-summary-chart.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultisampleSummaryChartComponent {
    private currentTab: IMultisampleSummaryAnalysisTab;

    public barChartConfiguration: IBarChartConfiguration = {
        grid:      true,
        container: { margin: { left: 25, right: 25, top: 20, bottom: 20 } }
    };

    @Input('tab')
    public set updateTab(tab: IMultisampleSummaryAnalysisTab) {
        this.currentTab = tab;
        this.updateStream(ChartEventType.UPDATE_DATA);
    }

    public stream: ChartGroupedStreamType = new ReplaySubject(1);

    private updateStream(type: ChartEventType): void {
        this.stream.next({ type, data: this.createData() });
    }

    private createData(): IChartGroupedDataEntry[] {
        if (this.currentTab === undefined) {
            return [];
        }

        return [
            { name: 'test1', values: [ 10, 10, 2, 3, 5, 7, 8, 9 ] },
            { name: 'test2', values: [ 6, 6, 2, 7, 8, 9, 1, 2 ] },
            { name: 'test3', values: [ 6, 3, 2, 2, 1, 2, 5, 8 ] },
            { name: 'test4', values: [ 9, 11, 2, 1, 7, 7, 4, 5 ] },
            { name: 'test5', values: [ 1, 2, 3, 4, 5, 6, 7, 8 ] },
            { name: 'test6', values: [ 8, 7, 6, 5, 4, 3, 2, 1 ] }
        ];
    }
}

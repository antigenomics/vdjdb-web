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

import { Injectable } from '@angular/core';
import { SampleFilters } from 'pages/annotations/sample/filters/sample-filters';
import { SampleItem } from 'shared/sample/sample-item';

export interface IMultisampleSummaryAnalysisTab {
    title: string;
    filters: SampleFilters;
    disabled: boolean;
    samples: SampleItem[];
}

@Injectable()
export class MultisampleSummaryService {
    private static readonly maxTabsAvailable: number = 5;
    private static readonly tabsNames: string[] = [ 'First', 'Second', 'Third', 'Fourth', 'Fifth' ];

    private tabs: IMultisampleSummaryAnalysisTab[] = [];
    private activeTab: IMultisampleSummaryAnalysisTab;

    constructor() {
        this.addNewTab();
    }

    public addNewTab(): void {
        if (this.tabs.length >= MultisampleSummaryService.maxTabsAvailable) {
            return;
        }
        this.tabs.push({
            title: MultisampleSummaryService.tabsNames[ this.tabs.length ],
            filters: new SampleFilters(),
            disabled: false,
            samples: []
        });
        this.activeTab = this.tabs[ this.tabs.length - 1 ];
    }

    public getTabs(): IMultisampleSummaryAnalysisTab[] {
        return this.tabs;
    }

    public setActiveTab(tab: IMultisampleSummaryAnalysisTab): void {
        this.activeTab = tab;
    }

    public isTabActive(tab: IMultisampleSummaryAnalysisTab): boolean {
        return tab === this.activeTab;
    }

    public isNewTabAllowed(): boolean {
        return this.tabs.length < MultisampleSummaryService.maxTabsAvailable;
    }

    public getCurrentTabFilters(): SampleFilters {
        return this.activeTab.filters;
    }

    public isCurrentTabDisabled(): boolean {
        return this.activeTab.disabled;
    }

    public isSampleSelected(sample: SampleItem): boolean {
        return this.activeTab.samples.indexOf(sample) !== -1;
    }

    public selectSample(sample: SampleItem): void {
        const index = this.activeTab.samples.indexOf(sample);
        if (index === -1) {
            this.activeTab.samples.push(sample);
        } else {
            this.activeTab.samples.splice(index, 1);
        }
    }

    public checkTabSelectedSamples(availableSamples: SampleItem[]): void {
        this.tabs.forEach((tab: IMultisampleSummaryAnalysisTab) => {
            tab.samples = tab.samples.filter((selected) => availableSamples.indexOf(selected) !== -1);
        });
    }
}

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
import { SampleItem } from 'shared/sample/sample-item';

export interface ISampleChartComponentItem {
    id: number;
    type: string;
}

@Injectable()
export class SampleChartService {
    private idCounter: number = 0;
    private charts: Map<string, ISampleChartComponentItem[]> = new Map();

    public getSampleCharts(sample: SampleItem): ISampleChartComponentItem[] {
        if (!this.charts.has(sample.name)) {
            this.charts.set(sample.name, new Array());
        }
        return this.charts.get(sample.name);
    }

    public addSampleChart(sample: SampleItem, type: string): void {
        const charts = this.getSampleCharts(sample);
        charts.push({ id: this.idCounter++, type });
    }

    public removeSampleChart(sample: SampleItem, chart: ISampleChartComponentItem): void {
        const charts = this.getSampleCharts(sample);
        const index = charts.findIndex((c) => c.id === chart.id);
        if (index !== -1) {
            charts.splice(index, 1);
        }
    }
}

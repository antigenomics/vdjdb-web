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

export type SampleChartComponentType = string;

@Injectable()
export class SampleChartService {
    private charts: Map<string, SampleChartComponentType[]> = new Map();

    public getSampleCharts(sample: SampleItem): SampleChartComponentType[] {
        if (!this.charts.has(sample.name)) {
            this.charts.set(sample.name, new Array());
        }
        return this.charts.get(sample.name);
    }

    public addSampleChart(sample: SampleItem, type: SampleChartComponentType): void {
        const charts = this.getSampleCharts(sample);
        charts.push(type);
    }
}

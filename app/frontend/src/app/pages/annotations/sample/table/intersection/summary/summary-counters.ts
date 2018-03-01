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

import { SummaryClonotypeCounter } from 'pages/annotations/sample/table/intersection/summary/summary-clonotype-counter';
import { SummaryFieldCounter } from 'pages/annotations/sample/table/intersection/summary/summary-field-counter';

export class SummaryCounters {
    public readonly counters: SummaryFieldCounter[];
    public readonly notFoundCounter: SummaryClonotypeCounter;

    constructor(c: any) {
        /* tslint:disable:no-string-literal */
        this.counters = c['counters'].map((v: any) => new SummaryFieldCounter(v));
        this.notFoundCounter = new SummaryClonotypeCounter(c['notFoundCounter']);
        /* tslint:enable:no-string-literal */
    }
}

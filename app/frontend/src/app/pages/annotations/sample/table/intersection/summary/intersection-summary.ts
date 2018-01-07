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

import { sum } from 'd3-array';
import { SummaryClonotypeCounter } from 'pages/annotations/sample/table/intersection/summary/summary-clonotype-counter';

export interface IntersectionSummaryDataType {
    [name: string]: { [field: string]: SummaryClonotypeCounter };
}

export class IntersectionSummary {
    private readonly data: IntersectionSummaryDataType;

    constructor(summary: any) {
        this.data = {};
        Object.keys(summary).forEach((name) => {
            if (this.data[ name ] === undefined) {
                this.data[ name ] = {};
            }
            const fields = summary[ name ];
            Object.keys(fields).forEach((field) => {
                this.data[ name ][ field ] = new SummaryClonotypeCounter(fields[ field ]);
            });
        });
    }
}

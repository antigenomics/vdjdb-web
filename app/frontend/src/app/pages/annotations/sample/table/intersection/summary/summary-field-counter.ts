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

import { SummaryClonotypeCounter } from 'pages/annotations/sample/table/intersection/summary/summary-clonotype-counter';

export class SummaryFieldCounter {
  public readonly name: string;
  public readonly counters: SummaryClonotypeCounter[];

  constructor(counter: any) {
    /* tslint:disable:no-string-literal */
    this.name = counter[ 'name' ];
    this.counters = counter[ 'counters' ].map((c: any) => new SummaryClonotypeCounter(c));
    /* tslint:enable:no-string-literal */
  }
}

/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

export class SearchTableRowMetadata {
    public pairedID: string;
    public cdr3vEnd: number;
    public cdr3jStart: number;

    constructor(meta: any) {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        this.pairedID = meta['pairedID'];
        this.cdr3vEnd = meta['cdr3vEnd'];
        this.cdr3jStart = meta['cdr3jStart'];
        /* tslint:enable:no-string-literal */
    }
}

export class SearchTableRow {
    public entries: string[];
    public metadata: SearchTableRowMetadata;

    constructor(row: any) {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        this.entries = row['entries'];
        this.metadata = new SearchTableRowMetadata(row['metadata']);
        /* tslint:enable:no-string-literal */
    }
}
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

export class IntersectionTableRowMetadata {
    public readonly vEnd: number;
    public readonly jStart: number;
    public readonly cdr3nt: string;

    constructor(meta: any) {
        /* tslint:disable:no-string-literal */
        this.vEnd = meta['vEnd'];
        this.jStart = meta['jStart'];
        this.cdr3nt = meta['cdr3nt'];
        /* tslint:enable:no-string-literal */
    }
}

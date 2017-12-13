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

export class IntersectionTableRowAlignment {
    public readonly seq1String: string;
    public readonly markup: string;
    public readonly seq2String: string;

    constructor(helper: any) {
        /* tslint:disable:no-string-literal */
        this.seq1String = helper['seq1String'];
        this.markup = helper['markup'];
        this.seq2String = helper['seq2String'];
        /* tslint:enable:no-string-literal */
    }
}

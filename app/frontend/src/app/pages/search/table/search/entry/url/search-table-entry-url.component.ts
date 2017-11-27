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

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'td[search-table-entry-url]',
    template: '<a [attr.href]="link" target="_blank" rel="noopener">{{ value }}</a>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryUrlComponent {
    private static prefixPMIDLength: number = 5;

    private _value: string;
    private _link: string;

    public generate(input: string) {
        if (input.indexOf('PMID') >= 0) {
            const id = input.substring(SearchTableEntryUrlComponent.prefixPMIDLength, input.length);
            this._link = `http://www.ncbi.nlm.nih.gov/pubmed/?term=${id}`;
            this._value = `PMID:${id}`;
        } else if (input.indexOf('http') >= 0) {
            let domain;
            // find & remove protocol (http, ftp, etc.) and get domain
            if (input.indexOf('://') > -1) {
                domain = input.split('/')[2];
            } else {
                domain = input.split('/')[0];
            }
            // find & remove port number
            this._value = domain.split(':')[0];
            this._link = input;
        }
    }

    get value() {
        return this._value;
    }

    get link() {
        return this._link;
    }
}
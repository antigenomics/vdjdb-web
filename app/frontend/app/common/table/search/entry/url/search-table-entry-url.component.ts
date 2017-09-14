import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'search-table-entry-url',
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
            this._link = 'http://www.ncbi.nlm.nih.gov/pubmed/?term=' + id;
            this._value = 'PMID: ' + id;
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

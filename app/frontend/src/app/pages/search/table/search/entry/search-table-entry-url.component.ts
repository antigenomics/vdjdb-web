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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ComponentFactoryResolver, Renderer2, ViewChild, ViewContainerRef } from '@angular/core';
import { PopupContentTable } from 'shared/modals/popup/popup-content-table';
import { PopupDirective } from 'shared/modals/popup/popup.directive';
import { TableColumn } from 'shared/table/column/table-column';
import { TableEntry } from 'shared/table/entry/table-entry';
import { TableRow } from 'shared/table/row/table-row';
import { Utils } from 'utils/utils';

export namespace SearchTableEntryURLType {
    export const PMID: number = 1;
    export const DEFAULT: number = 2;
}

export type SearchTableEntryURLType = number;

interface IPMIDArticleAuthorMetadata {
    readonly name: string;
    readonly authtype: string;
}

interface IPMIDArticleMetadata {
    readonly uid: string;
    readonly pubdate: string;
    readonly source: string;
    readonly authors: IPMIDArticleAuthorMetadata[];
    readonly title: string;
}

interface IPMIDArticleMetadataResult {
    readonly uids: string[];

    [id: string]: IPMIDArticleMetadata | string[];
}

@Component({
    selector:        'td[search-table-entry-url]',
    template:        `<a [attr.href]="link" target="_blank" rel="noopener" [popup]="popup" [header]="header" 
                         [loading]="loading" position="left" display="table" width="400" 
                         tableClass="ui very compact small very basic table" popupTableRowClass="left aligned" 
                         topShift="-70" shiftStrategy="per-item" footer="Click on the icon to follow the external link" #popupDirective>
                        <i class="ui icon external link alternate" style="color: rgb(55, 126, 184)"></i>
                      </a>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryUrlComponent extends TableEntry {
    private static referencePopupTableHeaders: string[] = [];
    private static pmidReferenceMetadataMap: Map<string, Promise<IPMIDArticleMetadata>> = new Map();
    private static prefixPMIDLength: number = 5;

    private focusInListener: () => void;
    private mouseEnterListener: () => void;

    @ViewChild('popupDirective', { read: PopupDirective })
    private directive: PopupDirective;

    public type: SearchTableEntryURLType;
    public header: string = 'Reference';
    public value: string;
    public link: string;
    public loading: boolean = true;
    public popup: PopupContentTable;

    constructor(private changeDetector: ChangeDetectorRef, private renderer: Renderer2) {
        super();
    }

    public create(entry: string, _column: TableColumn, _columns: TableColumn[], _row: TableRow,
                  hostViewContainer: ViewContainerRef, _resolver: ComponentFactoryResolver): void {
        if (entry.indexOf('PMID') >= 0) {
            this.type = SearchTableEntryURLType.PMID;
            this.value = entry.substring(SearchTableEntryUrlComponent.prefixPMIDLength, entry.length);
            this.link = `http://www.ncbi.nlm.nih.gov/pubmed/?term=${this.value}`;
        } else if (entry.indexOf('http') >= 0) {
            let domain;
            // find & remove protocol (http, ftp, etc.) and get domain
            if (entry.indexOf('://') > -1) {
                domain = entry.split('/')[ 2 ];
            } else {
                domain = entry.split('/')[ 0 ];
            }
            // find & remove port number
            this.type = SearchTableEntryURLType.DEFAULT;
            this.value = domain.split(':')[ 0 ];
            this.link = entry;
        }

        this.focusInListener = this.renderer.listen(hostViewContainer.element.nativeElement, 'focusin', () => {
            this.fetchReferenceMetadata();
        });
        this.mouseEnterListener = this.renderer.listen(hostViewContainer.element.nativeElement, 'mouseenter', () => {
            this.fetchReferenceMetadata();
        });
    }

    public fetchReferenceMetadata(): void {
        if (this.loading) {
            switch (this.type) {
                case SearchTableEntryURLType.PMID:
                    this.getPMIDMetadataPromise(this.value).then((metadata) => {
                        this.header = `Reference: PMID${this.value}`;

                        const rows: string[][] = [
                            [ 'Title', metadata.title ],
                            [ 'Date', metadata.pubdate ],
                            [ 'Source', metadata.source ],
                            [ 'Authors', `${metadata.authors[0].name} et al.` ]
                        ];

                        this.popup = new PopupContentTable(SearchTableEntryUrlComponent.referencePopupTableHeaders, rows);
                        this.loading = false;
                        this.updatePopup();
                    });
                    break;
                case SearchTableEntryURLType.DEFAULT:
                    this.popup = new PopupContentTable(SearchTableEntryUrlComponent.referencePopupTableHeaders, [
                        [ 'External link', this.link ]
                    ]);
                    this.loading = false;
                    this.updatePopup();
                    break;
                default:
                    throw new Error('SearchTableEntryUrlComponent:fetchReferenceMetadata - unreachable code');
            }
        }
        this.focusInListener();
        this.mouseEnterListener();
    }

    private getPMIDMetadataPromise(id: string): Promise<IPMIDArticleMetadata> {
        if (SearchTableEntryUrlComponent.pmidReferenceMetadataMap.has(id)) {
            return SearchTableEntryUrlComponent.pmidReferenceMetadataMap.get(id);
        } else {
            const promise = new Promise<IPMIDArticleMetadata>((resolve) => {
                const fetchPMIDMetaAPI = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${this.value}&retmode=json`;
                const response = Utils.HTTP.get(fetchPMIDMetaAPI);

                response.then((r) => {
                    const result = JSON.parse(r.responseText).result as IPMIDArticleMetadataResult;
                    const uid = result.uids[ 0 ];
                    const metadata = result[ uid ] as IPMIDArticleMetadata;

                    resolve(metadata);
                });
            });
            SearchTableEntryUrlComponent.pmidReferenceMetadataMap.set(id, promise);
            return promise;
        }
    }

    private updatePopup(): void {
        this.changeDetector.detectChanges();
        this.directive.updateView();
    }
}

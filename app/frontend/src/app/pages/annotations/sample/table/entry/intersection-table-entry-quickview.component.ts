/*
 *        Copyright 2017 Bagaev Dmitry
 *
 *        Licensed under the Apache License, Version 2.0 (the "License");
 *        you may not use this file except in compliance with the License.
 *        You may obtain a copy of the License at
 *
 *            http://www.apache.org/licenses/LICENSE-2.0
 *
 *        Unless required by applicable law or agreed to in writing, software
 *        distributed under the License is distributed on an "AS IS" BASIS,
 *        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *        See the License for the specific language governing permissions and
 *        limitations under the License.
 *
 */

import { ChangeDetectionStrategy, Component, HostBinding } from '@angular/core';
import { PopupContentTable } from '../../../../../shared/modals/popup/popup-content-table';
import { IntersectionTableRowMatch } from '../row/intersection-table-row-match';
import { IntersectionTableRowMetadata } from '../row/intersection-table-row-metadata';

@Component({
    selector:        'td[intersection-table-entry-quickview]',
    template:        `<i class="info circle icon cursor pointer" [popup]="quickView"
                     display="table" header="Quick view" position="right" width="700" topShift="-35" 
                     shiftStrategy="per-item" footer="Click on 'Detailed' icon to see more information"></i>`,
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class IntersectionTableEntryQuickviewComponent {

    @HostBinding('class.center')
    public classCenterHostBindingProperty: boolean = true;

    @HostBinding('class.aligned')
    public classAlignedHostBindingProperty: boolean = true;

    public quickView: PopupContentTable;

    public generate(matches: IntersectionTableRowMatch[], _: IntersectionTableRowMetadata) {
        const cdr3Index: number = 1;
        const epitopeIndex: number = 8;
        const speciesIndex: number = 10;
        const mhcaIndex: number = 5;
        const mhcbIndex: number = 6;
        const headers = [ 'CDR3', 'Epitope', 'Species', 'MHC.A', 'MHC.B' ];
        const rows = matches.map((match) => {
            const e = match.row.entries;
            return [ e[cdr3Index], e[epitopeIndex], e[speciesIndex], e[mhcaIndex], e[mhcbIndex] ];
        });
        this.quickView = new PopupContentTable(headers, rows);
    }
}

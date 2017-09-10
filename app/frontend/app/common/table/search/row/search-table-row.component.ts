import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SearchTableRow } from "./search-table-row";
import { SearchTableService } from "../search-table.service";


@Component({
    selector:    '[search-table-row]',
    templateUrl: './search-table-row.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableRowComponent {
    @Input('search-table-row')
    row: SearchTableRow;

    constructor (public table: SearchTableService) {}
}
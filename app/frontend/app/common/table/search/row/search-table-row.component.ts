import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { SearchTableService } from '../search-table.service';
import { SearchTableRow } from './search-table-row';

@Component({
    selector:    '[search-table-row]',
    templateUrl: './search-table-row.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableRowComponent {
    @Input('search-table-row')
    public row: SearchTableRow;

    constructor(public table: SearchTableService) {}
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SearchTableService } from './search-table.service';

@Component({
    selector:    'search-table',
    templateUrl: './search-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableComponent {
    constructor(public table: SearchTableService) {}
}

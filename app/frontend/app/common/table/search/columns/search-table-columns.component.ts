import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DatabaseColumnInfo } from '../../../../database/database-metadata';

@Component({
    selector:    '[search-table-columns]',
    templateUrl: './search-table-columns.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableColumnsComponent {
    @Input('search-table-columns')
    public columns: DatabaseColumnInfo[];
}

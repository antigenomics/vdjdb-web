import { ChangeDetectionStrategy, Component, Input } from '@angular/core';


@Component({
    selector:    '[search-table-columns]',
    templateUrl: './search-table-columns.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableColumnsComponent {
    @Input('search-table-columns')
    columns: string[];
}
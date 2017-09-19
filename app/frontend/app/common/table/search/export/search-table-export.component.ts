import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { ExportFormat, SearchTableService } from '../search-table.service';

@Component({
    selector:        'search-table-export',
    templateUrl:     './search-table-export.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableExportComponent {
    @Input()
    public formats: ExportFormat[];

    constructor(private table: SearchTableService) {}
}

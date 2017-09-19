import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SearchTableService } from '../search-table.service';

export class ExportFormat {
    public name: string;
    public title: string;

    constructor(name: string, title: string) {
        this.name = name;
        this.title = title;
    }
}

@Component({
    selector:        'search-table-export',
    templateUrl:     './search-table-export.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableExportComponent {

    constructor(private table: SearchTableService) {}

    public exportTable(format: ExportFormat): void {
        this.table.exportTable(format.name);
    }

    // noinspection JSMethodCanBeStatic
    public getAvailableFormats(): ExportFormat[] {
        return [ new ExportFormat('tab-delimited-txt', 'TAB-delimited txt') ];
    }
}

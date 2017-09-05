import { Component } from '@angular/core';
import { DatabaseService } from "../../../../database/database.service";
import { DatabaseColumnInfo, DatabaseMetadata } from "../../../../database/database-metadata";


@Component({
    selector:    'search-table-header',
    templateUrl: './search-table-header.component.html',
    styleUrls:   [ './search-table-header.component.css' ]
})
export class SearchTableHeaderComponent {
    visibleColumns: DatabaseColumnInfo[];

    constructor(private database: DatabaseService) {
        database.getMetadata().take(1).subscribe({
            next: (metadata: DatabaseMetadata) => {
                this.visibleColumns = metadata.columns.filter((column: DatabaseColumnInfo) => column.visible)
            }
        })
    }
}
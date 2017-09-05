import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { DatabaseService } from "../../../../database/database.service";
import { DatabaseColumnInfo, DatabaseMetadata } from "../../../../database/database-metadata";


@Component({
    selector:    '[search-table-columns]',
    templateUrl: './search-table-columns.component.html',
    styleUrls:   [ './search-table-columns.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableColumnsComponent {
    visibleColumns: DatabaseColumnInfo[];

    constructor(private database: DatabaseService, private changeDetector: ChangeDetectorRef) {
        database.getMetadata().take(1).subscribe({
            next: (metadata: DatabaseMetadata) => {
                this.visibleColumns = metadata.columns.filter((column: DatabaseColumnInfo) => column.visible);
                changeDetector.detectChanges();
            }
        })
    }
}
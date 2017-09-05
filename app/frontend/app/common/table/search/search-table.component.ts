import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { DatabaseService } from "../../../database/database.service";


@Component({
    selector:    'search-table',
    templateUrl: './search-table.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableComponent {
    loading: boolean;


    constructor(private database: DatabaseService, private changeDetector: ChangeDetectorRef) {
        this.loading = true;
    }

}
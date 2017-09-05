import { Component } from '@angular/core';
import { DatabaseService } from "../../../database/database.service";


@Component({
    selector:    'search-table',
    templateUrl: './search-table.component.html'
})
export class SearchTableComponent {

    constructor(private database: DatabaseService) {

    }


}
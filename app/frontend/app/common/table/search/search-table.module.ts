import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { ModalsModule } from '../../modals/modals.module';
import { WebSocketService } from '../../websocket/websocket.service';
import { SearchTableEntryCdrComponent } from './entry/cdr/search-table-entry-cdr.component';
import { SearchTableEntryJsonComponent } from './entry/json/search-table-entry-json.component';
import { SearchTableEntryOriginalComponent } from './entry/original/search-table-entry-original.component';
import { SearchTableEntryComponent } from './entry/search-table-entry.component';
import { SearchTableEntryUrlComponent } from './entry/url/search-table-entry-url.component';
import { SearchTableExportComponent } from './export/search-table-export.component';
import { SearchTableInfoComponent } from './info/search-table-info.component';
import { SearchTablePaginationComponent } from './pagination/search-table-pagination.component';
import { SearchTableRowComponent } from './row/search-table-row.component';
import { SearchTableComponent } from './search-table.component';
import { SearchTableService } from './search-table.service';

@NgModule({
    imports:         [ BrowserModule, FormsModule, ModalsModule ],
    declarations:    [  SearchTableComponent,
                        SearchTablePaginationComponent,
                        SearchTableInfoComponent,
                        SearchTableExportComponent,
                        SearchTableRowComponent,
                        SearchTableEntryComponent,
                        SearchTableEntryOriginalComponent,
                        SearchTableEntryJsonComponent,
                        SearchTableEntryUrlComponent,
                        SearchTableEntryCdrComponent ],
    exports:         [  SearchTableComponent,
                        SearchTablePaginationComponent,
                        SearchTableInfoComponent,
                        SearchTableExportComponent,
                        SearchTableRowComponent,
                        SearchTableEntryComponent,
                        SearchTableEntryOriginalComponent,
                        SearchTableEntryJsonComponent,
                        SearchTableEntryUrlComponent,
                        SearchTableEntryCdrComponent ],
    entryComponents: [ SearchTableEntryOriginalComponent, SearchTableEntryJsonComponent, SearchTableEntryUrlComponent, SearchTableEntryCdrComponent ],
    providers:       [ SearchTableService, WebSocketService ]
})
export class SearchTableModule {}

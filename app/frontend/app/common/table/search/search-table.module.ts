import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { ModalsModule } from '../../modals/modals.module';
import { SearchTableColumnsComponent } from './columns/search-table-columns.component';
import { SearchTableEntryCdrComponent } from './entry/cdr/search-table-entry-cdr.component';
import { SearchTableEntryJsonComponent } from './entry/json/search-table-entry-json.component';
import { SearchTableEntryOriginalComponent } from './entry/original/search-table-entry-original.component';
import { SearchTableEntryDirective } from './entry/search-table-entry.directive';
import { SearchTableEntryUrlComponent } from './entry/url/search-table-entry-url.component';
import { SearchTableRowComponent } from './row/search-table-row.component';
import { SearchTableComponent } from './search-table.component';
import { SearchTableService } from './search-table.service';
import { WebSocketService } from '../../websocket/websocket.service';
import { LoggerService } from '../../../utils/logger/logger.service';
import { NotificationService } from '../../../utils/notification/notification.service';

@NgModule({
    imports:         [ BrowserModule, FormsModule, ModalsModule ],
    declarations:    [  SearchTableComponent,
                        SearchTableColumnsComponent,
                        SearchTableRowComponent,
                        SearchTableEntryDirective,
                        SearchTableEntryOriginalComponent,
                        SearchTableEntryJsonComponent,
                        SearchTableEntryUrlComponent,
                        SearchTableEntryCdrComponent ],
    exports:         [  SearchTableComponent,
                        SearchTableColumnsComponent,
                        SearchTableRowComponent,
                        SearchTableEntryDirective,
                        SearchTableEntryOriginalComponent,
                        SearchTableEntryJsonComponent,
                        SearchTableEntryUrlComponent,
                        SearchTableEntryCdrComponent ],
    entryComponents: [ SearchTableEntryOriginalComponent, SearchTableEntryJsonComponent, SearchTableEntryUrlComponent, SearchTableEntryCdrComponent ],
    providers:       [ SearchTableService, WebSocketService ]
})
export class SearchTableModule {}

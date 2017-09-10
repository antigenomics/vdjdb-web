import { NgModule } from '@angular/core';
import { SearchTableComponent } from "./search-table.component";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";
import { SearchTableService } from "./search-table.service";
import { SearchTableColumnsComponent } from "./columns/search-table-columns.component";
import { SearchTableRowComponent } from "./row/search-table-row.component";
import { SearchTableEntryDirective } from "./entry/search-table-entry.directive";
import { SearchTableEntryOriginalComponent } from "./entry/original/search-table-entry-original.component";
import { SearchTableEntryJsonComponent } from "./entry/json/search-table-entry-json.component";
import { SearchTableEntryUrlComponent } from "./entry/url/search-table-entry-url.component";
import { ModalsModule } from "../../modals/modals.module";
import { SearchTableEntryCdrComponent } from "./entry/cdr/search-table-entry-cdr.component";

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
    providers:       [ SearchTableService ]
})
export class SearchTableModule {}
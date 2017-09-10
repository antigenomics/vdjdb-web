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


let entryComponents: any[] = [
    SearchTableEntryOriginalComponent,
    SearchTableEntryJsonComponent,
    SearchTableEntryUrlComponent,
    SearchTableEntryCdrComponent
];

let declarations: any[] = [ SearchTableComponent, SearchTableColumnsComponent, SearchTableRowComponent, SearchTableEntryDirective ].concat(entryComponents);

@NgModule({
    imports:         [ BrowserModule, FormsModule, ModalsModule ],
    declarations:    declarations,
    exports:         declarations,
    entryComponents: entryComponents,
    providers:       [ SearchTableService ]
})
export class SearchTableModule {}
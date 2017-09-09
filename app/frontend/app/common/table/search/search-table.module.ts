import { NgModule } from '@angular/core';
import { SearchTableComponent } from "./search-table.component";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";
import { SearchTableService } from "./search-table.service";
import { EntryPipe } from "./entry/transform/entry.pipe";
import { SearchTableColumnsComponent } from "./columns/search-table-columns.component";

@NgModule({
    imports:      [ BrowserModule, FormsModule ],
    declarations: [ SearchTableComponent, SearchTableColumnsComponent, EntryPipe ],
    exports:      [ SearchTableComponent, SearchTableColumnsComponent, EntryPipe ],
    providers:    [ SearchTableService ]
})
export class SearchTableModule {}
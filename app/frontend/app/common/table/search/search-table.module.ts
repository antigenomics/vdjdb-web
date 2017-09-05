import { NgModule } from '@angular/core';
import { SearchTableComponent } from "./search-table.component";
import { SearchTableColumnsComponent } from "./columns/search-table-columns.component";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";

@NgModule({
    imports:      [ BrowserModule, FormsModule ],
    declarations: [ SearchTableComponent, SearchTableColumnsComponent ],
    exports:      [ SearchTableComponent, SearchTableColumnsComponent ]
})
export class SearchTableModule {}
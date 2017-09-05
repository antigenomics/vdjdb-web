import { NgModule } from '@angular/core';
import { SearchTableComponent } from "./search-table.component";
import { SearchTableHeaderComponent } from "./header/search-table-header.component";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";

@NgModule({
    imports:      [ BrowserModule, FormsModule ],
    declarations: [ SearchTableComponent, SearchTableHeaderComponent ],
    exports:      [ SearchTableComponent, SearchTableHeaderComponent ]
})
export class SearchTableModule {}
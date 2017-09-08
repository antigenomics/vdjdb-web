import { NgModule } from '@angular/core';
import { SearchTableComponent } from "./search-table.component";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";
import { SearchTableService } from "./search-table.service";

@NgModule({
    imports:      [ BrowserModule, FormsModule ],
    declarations: [ SearchTableComponent ],
    exports:      [ SearchTableComponent ],
    providers:    [ SearchTableService ]
})
export class SearchTableModule {}
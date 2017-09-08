import { NgModule } from '@angular/core';
import { SearchTableComponent } from "./search-table.component";
import { BrowserModule } from "@angular/platform-browser";
import { FormsModule } from "@angular/forms";
import { SearchTableService } from "./search-table.service";
import { EntryPipe } from "./entry/transform/entry.pipe";

@NgModule({
    imports:      [ BrowserModule, FormsModule ],
    declarations: [ SearchTableComponent, EntryPipe ],
    exports:      [ SearchTableComponent, EntryPipe ],
    providers:    [ SearchTableService ]
})
export class SearchTableModule {}
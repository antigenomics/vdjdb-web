import { NgModule } from '@angular/core';
import { SearchPageComponent } from "./search.component";
import { BrowserModule } from '@angular/platform-browser';
import { FiltersModule } from "../../common/filters/filters.module";
import { FiltersService } from "../../common/filters/filters.service";
import { SearchTableModule } from "../../common/table/search/search-table.module";
import { SearchTableService } from "../../common/table/search/search-table.service";

@NgModule({
    imports:      [ BrowserModule, FiltersModule, SearchTableModule ],
    declarations: [ SearchPageComponent ],
    exports:      [ SearchPageComponent ],
    providers:    [ FiltersService, SearchTableService ]
})
export class SearchPageModule {}
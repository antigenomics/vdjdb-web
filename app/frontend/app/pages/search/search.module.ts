import { NgModule } from '@angular/core';
import { SearchPageComponent } from "./search.component";
import { BrowserModule } from '@angular/platform-browser';
import { FiltersModule } from "../../common/filters/filters.module";
import { FiltersService } from "../../common/filters/filters.service";
import { SearchTableComponent } from "../../common/table/search/search-table.component";

@NgModule({
    imports:      [ BrowserModule, FiltersModule ],
    declarations: [ SearchPageComponent, SearchTableComponent ],
    exports:      [ SearchPageComponent, SearchTableComponent ],
    providers:    [ FiltersService ]
})
export class SearchPageModule {}
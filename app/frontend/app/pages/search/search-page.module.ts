import { NgModule } from '@angular/core';
import { SearchPageComponent } from "./search-page.component";
import { BrowserModule } from '@angular/platform-browser';
import { FiltersModule } from "../../filters/filters.module";

@NgModule({
    imports:      [ BrowserModule, FiltersModule ],
    declarations: [ SearchPageComponent ],
    exports:      [ SearchPageComponent ]
})
export class SearchPageModule {}
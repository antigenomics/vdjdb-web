import { NgModule } from '@angular/core';
import { SearchPageComponent } from "./search.component";
import { BrowserModule } from '@angular/platform-browser';
import { FiltersModule } from "../../common/filters/filters.module";
import { FiltersService } from "../../common/filters/filters.service";

@NgModule({
    imports:      [ BrowserModule, FiltersModule ],
    declarations: [ SearchPageComponent ],
    exports:      [ SearchPageComponent ],
    providers:    [ FiltersService ]
})
export class SearchPageModule {}
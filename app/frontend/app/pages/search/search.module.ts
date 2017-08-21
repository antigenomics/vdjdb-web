import { NgModule } from '@angular/core';
import { SearchPageComponent } from "./search.component";
import { BrowserModule } from '@angular/platform-browser';
import { FiltersModule } from "../../common/filters/filters.module";
import { FiltersService } from "../../common/filters/filters.service";
import { FiltersTCRService } from "../../common/filters/filters_tcr/filters-tcr.service";
import { FiltersMHCService } from "../../common/filters/filters_mhc/filters-mhc.service";
import { FiltersAGService } from "../../common/filters/filters_ag/filters-ag.service";
import { FiltersMetaService } from "../../common/filters/filters_meta/filters-meta.service";

@NgModule({
    imports:      [ BrowserModule, FiltersModule ],
    declarations: [ SearchPageComponent ],
    exports:      [ SearchPageComponent ],
    providers:    [ FiltersService, FiltersTCRService, FiltersMHCService, FiltersAGService, FiltersMetaService ]
})
export class SearchPageModule {}
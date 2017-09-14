import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FiltersModule } from '../../common/filters/filters.module';
import { FiltersService } from '../../common/filters/filters.service';
import { SearchTableModule } from '../../common/table/search/search-table.module';
import { SearchTableService } from '../../common/table/search/search-table.service';
import { SearchInfoComponent } from './info/search-info.component';
import { SearchPageComponent } from './search.component';

@NgModule({
    imports:      [ BrowserModule, FiltersModule, SearchTableModule ],
    declarations: [ SearchPageComponent, SearchInfoComponent ],
    exports:      [ SearchPageComponent, SearchInfoComponent ],
    providers:    [ FiltersService, SearchTableService ]
})
export class SearchPageModule {}

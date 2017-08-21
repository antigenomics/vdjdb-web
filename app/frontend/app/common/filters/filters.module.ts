import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { FiltersComponent } from './filters.component';
import { FiltersTCRComponent } from './filters_tcr/filters-tcr.component';
import { FiltersFormsModule } from "./forms/filters.forms.module";
import { ModalsModule } from '../modals/modals.module';
import { FiltersMHCComponent } from "./filters_mhc/filters-mhc.component";
import { FiltersAGComponent } from "./filters_ag/filters-ag.component";
import { FiltersMetaComponent } from "./filters_meta/filters-meta.component";



@NgModule({
    imports:         [ BrowserModule, FormsModule, FiltersFormsModule, ModalsModule ],
    declarations:    [ FiltersComponent, FiltersTCRComponent, FiltersMHCComponent, FiltersAGComponent, FiltersMetaComponent ],
    exports:         [ FiltersComponent, FiltersTCRComponent, FiltersMHCComponent, FiltersAGComponent, FiltersMetaComponent ]
})
export class FiltersModule {}

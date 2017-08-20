import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { FiltersComponent } from './filters.component';
import { FiltersTCRComponent } from './filters_tcr/filters-tcr.component';
import { FiltersFormsModule } from "./forms/filters.forms.module";
import { ModalsModule } from '../modals/modals.module';



@NgModule({
    imports:         [ BrowserModule, FormsModule, FiltersFormsModule, ModalsModule ],
    declarations:    [ FiltersComponent, FiltersTCRComponent ],
    exports:         [ FiltersComponent, FiltersTCRComponent ]
})
export class FiltersModule {}

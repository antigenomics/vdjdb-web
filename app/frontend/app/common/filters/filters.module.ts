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
import { FiltersTCRService } from "./filters_tcr/filters-tcr.service";
import { FiltersMHCService } from "./filters_mhc/filters-mhc.service";
import { FiltersAGService } from "./filters_ag/filters-ag.service";
import { FiltersMetaService } from "./filters_meta/filters-meta.service";


@NgModule({
    imports:         [ BrowserModule, FormsModule, FiltersFormsModule, ModalsModule ],
    declarations:    [ FiltersComponent, FiltersTCRComponent, FiltersMHCComponent, FiltersAGComponent, FiltersMetaComponent ],
    exports:         [ FiltersComponent, FiltersTCRComponent, FiltersMHCComponent, FiltersAGComponent, FiltersMetaComponent ],
    providers:       [ FiltersTCRService, FiltersMHCService, FiltersAGService, FiltersMetaService ]
})
export class FiltersModule {}

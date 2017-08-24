import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { FiltersComponent } from './filters.component';
import { FiltersFormsModule } from "./forms/filters.forms.module";
import { ModalsModule } from '../modals/modals.module';
import { FiltersGroupComponent } from "./filters-group.component";
import { AG_FILTER_COMPONENTS } from "./filters_ag/ag-filters";
import { TCR_FILTER_COMPONENTS } from "./filters_tcr/tcr-filters";
import { MHC_FILTER_COMPONENTS } from "./filters_mhc/mhc-filters";
import { META_FILTER_COMPONENTS } from "./filters_meta/meta-filters";


@NgModule({
    imports:         [ BrowserModule, FormsModule, FiltersFormsModule, ModalsModule ],
    declarations:    [ FiltersComponent, FiltersGroupComponent, TCR_FILTER_COMPONENTS, AG_FILTER_COMPONENTS, MHC_FILTER_COMPONENTS, META_FILTER_COMPONENTS ],
    exports:         [ FiltersComponent, FiltersGroupComponent, TCR_FILTER_COMPONENTS, AG_FILTER_COMPONENTS, MHC_FILTER_COMPONENTS, META_FILTER_COMPONENTS ]
})
export class FiltersModule {}

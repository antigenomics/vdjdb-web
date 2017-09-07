import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { FiltersFormsModule } from './forms/filters.forms.module';
import { ModalsModule } from '../modals/modals.module';
import { FiltersGroupComponent } from './group/filters-group.component';
import { AG_FILTER_COMPONENTS } from './filters_ag/ag-filters';
import { TCR_FILTER_COMPONENTS } from './filters_tcr/tcr-filters';
import { MHC_FILTER_COMPONENTS } from './filters_mhc/mhc-filters';
import { META_FILTER_COMPONENTS } from './filters_meta/meta-filters';
import { FiltersGroupService } from "./group/filters-group.service";


@NgModule({
    imports:         [ BrowserModule, FormsModule, FiltersFormsModule, ModalsModule ],
    declarations:    [ FiltersGroupComponent, TCR_FILTER_COMPONENTS, AG_FILTER_COMPONENTS, MHC_FILTER_COMPONENTS, META_FILTER_COMPONENTS ],
    exports:         [ FiltersGroupComponent, TCR_FILTER_COMPONENTS, AG_FILTER_COMPONENTS, MHC_FILTER_COMPONENTS, META_FILTER_COMPONENTS ],
    providers:       [ FiltersGroupService ]
})
export class FiltersModule {}

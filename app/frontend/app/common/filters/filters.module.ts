import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { FiltersCommonModule } from './common/filters-common.module';
import { ModalsModule } from '../modals/modals.module';
import { FiltersService } from "./filters.service";

import { TCRGeneralFilterComponent } from "./filters_tcr/tcr_general_filter/tcr-general-filter.component";
import { TCRSegmentsFilterComponent } from "./filters_tcr/tcr_segments_filter/tcr-segments-filter.component";
import { TCR_CDR3FilterComponent } from "./filters_tcr/tcr_cdr3_filter/tcr-cdr3-filter.component";
import { TCRFiltersService } from "./filters_tcr/tcr-filters.service";
import { AGOriginFilterComponent } from "./filters_ag/ag_origin_filter/ag-origin-filter.component";
import { AGEpitopeFilterComponent } from "./filters_ag/ag_epitope_filter/ag-epitope-filter.component";
import { AGFiltersService } from "./filters_ag/ag-filters.service";
import { MHCGeneralFilterComponent } from "./filters_mhc/mhc_general_filter/mhc-general-filter.component";
import { MHCHaplotypeFilterComponent } from "./filters_mhc/mhc_haplotype_filter/mhc-haplotype-filter.component";
import { MHCFiltersService } from "./filters_mhc/mhc-filters.service";
import { MetaFiltersService } from "./filters_meta/meta-filters.service";
import { MetaGeneralFilterComponent } from "./filters_meta/meta_general_filter/meta-general-filter.component";
import { MetaReliabilityFilterComponent } from "./filters_meta/meta_reliability_filter/meta-reliability-filter.component";


@NgModule({
    imports:      [ BrowserModule, FormsModule, FiltersCommonModule, ModalsModule ],
    declarations: [ TCRGeneralFilterComponent, TCRSegmentsFilterComponent, TCR_CDR3FilterComponent,
        AGOriginFilterComponent, AGEpitopeFilterComponent,
        MHCGeneralFilterComponent, MHCHaplotypeFilterComponent,
        MetaGeneralFilterComponent, MetaReliabilityFilterComponent ],
    exports:      [ TCRGeneralFilterComponent, TCRSegmentsFilterComponent, TCR_CDR3FilterComponent,
        AGOriginFilterComponent, AGEpitopeFilterComponent,
        MHCGeneralFilterComponent, MHCHaplotypeFilterComponent,
        MetaGeneralFilterComponent, MetaReliabilityFilterComponent ],
    providers:    [ FiltersService, TCRFiltersService, AGFiltersService, MHCFiltersService, MetaFiltersService ]
})
export class FiltersModule {}

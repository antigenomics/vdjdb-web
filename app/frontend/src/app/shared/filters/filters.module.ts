/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalsModule } from '../modals/modals.module';
import { FiltersCommonModule } from './common/filters-common.module';
import { FiltersService } from './filters.service';

import { AGFiltersService } from './filters_ag/ag-filters.service';
import { AGEpitopeFilterComponent } from './filters_ag/ag_epitope_filter/ag-epitope-filter.component';
import { AGOriginFilterComponent } from './filters_ag/ag_origin_filter/ag-origin-filter.component';
import { MetaFiltersService } from './filters_meta/meta-filters.service';
import { MetaGeneralFilterComponent } from './filters_meta/meta_general_filter/meta-general-filter.component';
import { MetaReliabilityFilterComponent } from './filters_meta/meta_reliability_filter/meta-reliability-filter.component';
import { MHCFiltersService } from './filters_mhc/mhc-filters.service';
import { MHCGeneralFilterComponent } from './filters_mhc/mhc_general_filter/mhc-general-filter.component';
import { MHCHaplotypeFilterComponent } from './filters_mhc/mhc_haplotype_filter/mhc-haplotype-filter.component';
import { TCRFiltersService } from './filters_tcr/tcr-filters.service';
import { TCRcdr3FilterComponent } from './filters_tcr/tcr_cdr3_filter/tcr-cdr3-filter.component';
import { TCRGeneralFilterComponent } from './filters_tcr/tcr_general_filter/tcr-general-filter.component';
import { TCRSegmentsFilterComponent } from './filters_tcr/tcr_segments_filter/tcr-segments-filter.component';

@NgModule({
    imports:      [ CommonModule, FormsModule, FiltersCommonModule, ModalsModule ],
    declarations: [ TCRGeneralFilterComponent, TCRSegmentsFilterComponent, TCRcdr3FilterComponent,
        AGOriginFilterComponent, AGEpitopeFilterComponent,
        MHCGeneralFilterComponent, MHCHaplotypeFilterComponent,
        MetaGeneralFilterComponent, MetaReliabilityFilterComponent ],
    exports:      [ TCRGeneralFilterComponent, TCRSegmentsFilterComponent, TCRcdr3FilterComponent,
        AGOriginFilterComponent, AGEpitopeFilterComponent,
        MHCGeneralFilterComponent, MHCHaplotypeFilterComponent,
        MetaGeneralFilterComponent, MetaReliabilityFilterComponent ],
    providers:    [ TCRFiltersService, AGFiltersService, MHCFiltersService, MetaFiltersService, FiltersService ]
})
export class FiltersModule {}

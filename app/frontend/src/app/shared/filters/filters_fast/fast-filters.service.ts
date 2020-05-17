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

import { Injectable } from "@angular/core";
import { AGFiltersService } from "shared/filters/filters_ag/ag-filters.service";
import { TCRFiltersService } from "shared/filters/filters_tcr/tcr-filters.service";
import { MHCFiltersService } from "shared/filters/filters_mhc/mhc-filters.service";
import { MetaFiltersService } from "shared/filters/filters_meta/meta-filters.service";

@Injectable()
export class FastFiltersService {

    constructor(private readonly ag: AGFiltersService, private readonly tcr: TCRFiltersService,
                private readonly mhc: MHCFiltersService, private readonly meta: MetaFiltersService) {
    }

    public setFastFilters(preset: string) {
        this.resetToDefault()
        switch (preset) {
            case 'COVID-19':
                this.setFastFiltersCovid19();
                break;
            default:
        }
    }

    private setFastFiltersCovid19(): void {
        // Filters placeholder here
    }

    private resetToDefault(): void {
        this.ag.setDefault();
        this.tcr.setDefault();
        this.mhc.setDefault();
        this.meta.setDefault();
    }
}
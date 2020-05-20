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
import { SetEntry } from "shared/filters/common/set/set-entry";
import { AGFiltersService } from "shared/filters/filters_ag/ag-filters.service";
import {TCRFiltersService} from "shared/filters/filters_tcr/tcr-filters.service";

export namespace CommonInfectionType {
    export const SARSCOV: string = 'SARS-CoV';
    export const INFLUENZA: string = 'Influenza';
}

@Injectable()
export class InfectionsService {

    constructor(private readonly ag: AGFiltersService, private readonly tcr: TCRFiltersService) {}

    public isInfectionSelected(infection: string): boolean {
        const isSpeciesSelected = this.ag.origin.speciesSelected.findIndex((e) => { return e.value === infection }) !== -1;
        const isTRA_BSelected = this.tcr.general.tra && this.tcr.general.trb
        return isSpeciesSelected && isTRA_BSelected
    }

    public selectInfection(infection: string): void {
        if (this.isInfectionSelected(infection)) {
            this.ag.origin.speciesSelected.splice(this.ag.origin.speciesSelected.findIndex((e) => { return e.value === infection }), 1)
        } else {
            this.ag.origin.speciesSelected.push(new SetEntry(infection, infection, false));
            this.tcr.general.tra = true;
            this.tcr.general.trb = true
        }
    }

}
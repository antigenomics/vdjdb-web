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

import { Component } from '@angular/core';
import { CommonDiseaseType, DiseasesService } from "shared/filters/diseases.service";

@Component({
    selector: 'ag-diseases-filter',
    templateUrl: './ag-diseases-filter.component.html'
})
export class AGDiseasesFilterComponent {
    constructor(public diseases: DiseasesService) {}

    public switchCovid(): void {
        this.diseases.selectDisease(CommonDiseaseType.SARSCOV, true)
    }

    public isCovidSelected(): boolean {
        return this.diseases.isDiseaseSelected(CommonDiseaseType.SARSCOV)
    }

    public switchFlu(): void {
        this.diseases.selectDisease(CommonDiseaseType.INFLUENZA, true)
    }

    public isFluSelected(): boolean {
        return this.diseases.isDiseaseSelected(CommonDiseaseType.INFLUENZA)
    }

    public switchCancer(): void {
        this.diseases.selectDisease(CommonDiseaseType.CANCER, true)
    }

    public isCancerSelected(): boolean {
        return this.diseases.isDiseaseSelected(CommonDiseaseType.CANCER)
    }

}


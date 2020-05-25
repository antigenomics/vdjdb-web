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
import {CommonInfectionType, InfectionsService} from "shared/filters/infections.service";

@Component({
  selector:    'ag-infections-filter',
  templateUrl: './ag-infections-filter.component.html'
})
export class AGInfectionsFilterComponent {
  constructor(public infections: InfectionsService) {}

  public switchCovid(): void {
    this.infections.selectInfection(CommonInfectionType.SARSCOV, true)
  }

  public isCovidSelected(): boolean {
    return this.infections.isInfectionSelected(CommonInfectionType.SARSCOV)
  }

  public switchFlu(): void {
    this.infections.selectInfection(CommonInfectionType.INFLUENZA, true)
  }

  public isFluSelected(): boolean {
    return this.infections.isInfectionSelected(CommonInfectionType.INFLUENZA)
  }

}


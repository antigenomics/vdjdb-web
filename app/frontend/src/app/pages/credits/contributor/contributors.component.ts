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

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { contributors, contributorsGroupedByAffiliations } from './contributors';

export const enum ViewType {
  CONTRIBUTORS,
  AFFILIATIONS
}

export const enum SortType {
  UNIVERSITY,
  CITY,
  COUNTRY
}

@Component({
  selector:        'contributors',
  templateUrl:     './contributors.component.html',
  styleUrls:       [ './contributors.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContributorsComponent {
  public viewType: ViewType = ViewType.AFFILIATIONS;

  public contributors = contributors;

  public contributorsGroupedByAffiliations = contributorsGroupedByAffiliations;
  public contributorsGroupedByAffiliationsSortType = SortType.UNIVERSITY;

  public get isGropedByContributors(): boolean {
    return this.viewType === ViewType.CONTRIBUTORS;
  }

  public groupByContributors(): void {
    this.viewType = ViewType.CONTRIBUTORS;
  }

  public get isGropedByAffiliations(): boolean {
    return this.viewType === ViewType.AFFILIATIONS;
  }

  public groupByAffiliations(): void {
    this.viewType = ViewType.AFFILIATIONS;
  }

  public get isAffiliationsGroupsSortedByUniversity(): boolean {
    return this.contributorsGroupedByAffiliationsSortType === SortType.UNIVERSITY;
  }

  public sortAffiliationsGroupsByUniversity(): void {
    this.contributorsGroupedByAffiliationsSortType = SortType.UNIVERSITY;
  }

  public get isAffiliationsGroupsSortedByCity(): boolean {
    return this.contributorsGroupedByAffiliationsSortType === SortType.CITY;
  }

  public sortAffiliationsGroupsByCity(): void {
    this.contributorsGroupedByAffiliationsSortType = SortType.CITY;
  }

  public get isAffiliationsGroupsSortedByCountry(): boolean {
    return this.contributorsGroupedByAffiliationsSortType === SortType.COUNTRY;
  }

  public sortAffiliationsGroupsByCountry(): void {
    this.contributorsGroupedByAffiliationsSortType = SortType.COUNTRY;
  }
}

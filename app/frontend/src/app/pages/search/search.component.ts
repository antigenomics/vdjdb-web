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

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SearchTable } from 'pages/search/table/search/search-table';
import { SetEntry } from 'shared/filters/common/set/set-entry';
import { FiltersService } from 'shared/filters/filters.service';
import { AGFiltersService } from 'shared/filters/filters_ag/ag-filters.service';
import { TCRFiltersService } from 'shared/filters/filters_tcr/tcr-filters.service';
import { DiseasesService } from 'shared/filters/diseases.service';
import { TableColumn } from 'shared/table/column/table-column';
import { AnalyticsService } from 'utils/analytics/analytics.service';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';
import { SearchTableService } from './table/search/search-table.service';
import { SearchAvailabilityService } from './table/search/search-availability.service';
import { MetaFiltersService } from 'shared/filters/filters_meta/meta-filters.service';

@Component({
  selector:    'search',
  templateUrl: './search.component.html'
})
export class SearchPageComponent implements OnInit, OnDestroy {
  public columns: TableColumn[] = [];
  public table: SearchTable;

  constructor(private searchTableService: SearchTableService, private filters: FiltersService,
              private route: ActivatedRoute, private ag: AGFiltersService, private tcr: TCRFiltersService,
              private diseases: DiseasesService, private meta: MetaFiltersService,
              private availability: SearchAvailabilityService,
              logger: LoggerService, notifications: NotificationService, analytics: AnalyticsService) {
    this.table = new SearchTable(searchTableService, filters, analytics, logger, notifications);
    // Warm the (large) evidence availability index up front so the Evidence-column "M" badges
    // colour as soon as possible instead of after the table first renders.
    this.availability.prefetch();
    if (this.searchTableService.isInitialized()) {
      this.fetchColumns();
      this.table.updateNumberOfRecords(this.searchTableService.getMetadata().numberOfRecords);
    }
  }

  public ngOnInit(): void {
    const epitopeSeq = this.route.snapshot.queryParamMap.get('epitope_seq');
    const isFromDisease = this.diseases.isPendingDisease;

    // Reset filters unless coming from a disease action component
    if (!isFromDisease) {
      this.filters.setDefault();
    }

    // Apply epitope filter if provided via query parameter
    if (epitopeSeq) {
      this.ag.epitope.epitopeSelected = [ new SetEntry(epitopeSeq, epitopeSeq, false) ];
      this.tcr.general.tra = true;
      this.tcr.general.trb = true;
      this.tcr.general.pairedOnly = true;
    }

    const structParam = this.route.snapshot.queryParamMap.get('struct');
    if (structParam) {
      const modes = structParam.split(',').map((s) => s.trim());
      if (modes.indexOf('native') !== -1) { this.meta.reliability.structNative = true; }
      if (modes.indexOf('contacts') !== -1) { this.meta.reliability.structContacts = true; }
      if (modes.indexOf('quality') !== -1) { this.meta.reliability.structQuality = true; }
    }

    if (!this.searchTableService.isInitialized()) {
      this.searchTableService.waitInitialization().then(() => {
        this.fetchColumns();
        this.table.updateNumberOfRecords(this.searchTableService.getMetadata().numberOfRecords);
        // Always search if filters were reset or no cached data exists
        if (!isFromDisease || !this.table.dirty) {
          this.table.update();
        }
      });
    }
  }

  public search(): void {
    this.table.update();
  }

  public reset(): void {
    this.filters.setDefault();
  }

  public isLoading(): boolean {
    return this.table.loading || !this.table.dirty;
  }

  public ngOnDestroy(): void {
    this.table.destroy();
  }

  private fetchColumns(): void {
    const metadata = this.searchTableService.getMetadata();
    this.columns = metadata.columns.map((c) => {
      return new TableColumn(c.name, c.title, true, !c.visible, false, true, c.comment, 'Click to sort column');
    });
  }
}

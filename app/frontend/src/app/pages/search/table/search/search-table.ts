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

import { SearchTableService, SearchTableServiceEvents, SearchTableWebSocketActions } from 'pages/search/table/search/search-table.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Filter } from 'shared/filters/filters';
import { FiltersService } from 'shared/filters/filters.service';
import { IExportFormat, IExportOptionFlag } from 'shared/table/export/table-export.component';
import { Table } from 'shared/table/table';
import { WebSocketConnection, WebSocketResponseStatus } from 'shared/websocket/websocket-connection';
import { WebSocketRequestData } from 'shared/websocket/websocket-request';
import { WebSocketResponseData } from 'shared/websocket/websocket-response';
import { AnalyticsService } from 'utils/analytics/analytics.service';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';
import { Utils } from 'utils/utils';
import { SearchTableRow } from './row/search-table-row';

export class SearchTable extends Table<SearchTableRow> {
  private static readonly SEARCH_DATABASE_GOAL: string = 'search-database-goal';
  private static readonly EXPORT_DATABASE_GOAL: string = 'export-database-goal';
  private static readonly CHANGE_PAGE_TABLE_GOAL: string = 'change-page-table-goal';

  private needReconnectEventSubscription: Subscription;

  constructor(private searchTableService: SearchTableService, private filters: FiltersService, private analytics: AnalyticsService,
              private logger: LoggerService, private notifications: NotificationService) {
    super();
    const last = this.searchTableService.getLastResponse();
    if (last !== undefined) {
      this.updateFromResponse(last);
    }

    this.needReconnectEventSubscription = this.searchTableService.getEvents().pipe(filter((event) => {
      return event === SearchTableServiceEvents.NEED_RECONNECT;
    })).subscribe(() => {
      this.checkConnection(true, false).then(() => {
        this.searchTableService.sendEvent(SearchTableServiceEvents.RECONNECTED);
      });
    });
  }

  public getRows(): SearchTableRow[] {
    return this.rows;
  }

  public async update(): Promise<void> {
    if (this.loading) {
      this.notifications.warn('Search', 'Loading');
      return;
    }

    await this.checkConnection(false);

    const filters: Filter[] = [];
    const errors: string[] = [];
    this.filters.collectFilters(filters, errors);
    this.logger.debug('Collected filters', filters);

    if (errors.length === 0) {
      this.startLoading();
      const ifilters = FiltersService.unpackFilters(filters);
      const response = await this.getConnection().sendMessage({
        action: SearchTableWebSocketActions.SEARCH,
        data:   new WebSocketRequestData()
                  .add('filters', ifilters)
                  .add('pageSize', this.pageSize)
                  .unpack()
      });

      this.logger.debug('Search', response);
      this.analytics.reachGoal(SearchTable.SEARCH_DATABASE_GOAL, ifilters);
      this.updateFromResponse(response);
      this.sortRule.clear();
    } else {
      errors.forEach((error: string) => {
        this.notifications.error('Filters error', error);
      });
    }
  }

  public async sort(column: string): Promise<void> {
    await this.checkConnection();
    this.startLoading();
    this.sortRule.update(column);
    this.logger.debug('Sort rule', this.sortRule);
    const response = await this.getConnection().sendMessage({
      action: SearchTableWebSocketActions.SEARCH,
      data:   new WebSocketRequestData()
                .add('sort', this.sortRule.toString())
                .unpack()
    });
    this.logger.debug('Sort', response);
    this.updateFromResponse(response);
  }

  public async changePage(page: number): Promise<void> {
    await this.checkConnection();
    this.startLoading();
    this.logger.debug('Page change', page);
    const response = await this.getConnection().sendMessage({
      action: SearchTableWebSocketActions.SEARCH,
      data:   new WebSocketRequestData()
                .add('page', page)
                .unpack()
    });
    this.logger.debug('Page change', response);
    this.analytics.reachGoal(SearchTable.CHANGE_PAGE_TABLE_GOAL, page);
    this.updateFromResponse(response);
  }

  public async exportTable(request: { format: IExportFormat, options: IExportOptionFlag[] }): Promise<void> {
    const { format, options } = request;
    await this.checkConnection(true, false);
    this.logger.debug('Export', format);
    const response = await this.getConnection().sendMessage({
      action: SearchTableWebSocketActions.EXPORT,
      data:   new WebSocketRequestData()
                .add('format', format.name)
                .add('options', options)
                .unpack()
    });
    this.logger.debug('Export', response);
    if (response.get('status') === WebSocketResponseStatus.SUCCESS) {
      this.analytics.reachGoal(SearchTable.EXPORT_DATABASE_GOAL, request);
      Utils.File.download(response.get('link'));
    } else {
      this.notifications.warn('Export', response.get('message'));
    }
  }

  public async changePageSize(pageSize: number): Promise<void> {
    await this.checkConnection();
    this.startLoading();
    this.logger.debug('Page size', pageSize);
    const response = await this.getConnection().sendMessage({
      action: SearchTableWebSocketActions.SEARCH,
      data:   new WebSocketRequestData()
                .add('pageSize', pageSize)
                .unpack()
    });
    this.logger.debug('Page size', response);
    this.updateFromResponse(response);
  }

  public destroy(): void {
    this.needReconnectEventSubscription.unsubscribe();
  }

  private getConnection(): WebSocketConnection {
    return this.searchTableService.getConnection();
  }

  private updateFromResponse(response: WebSocketResponseData): void {
    const page = response.get('page');
    const pageSize = response.get('pageSize');
    const rows = response.get('rows').map((row: any) => new SearchTableRow(row));
    const pageCount = response.get('pageCount');
    const recordsFound = response.get('recordsFound');
    this.updateTable(page, pageSize, rows, pageCount);
    this.updateRecordsFound(recordsFound);
  }

  private async checkConnection(reInitOnBadConnection: boolean = true, showLoadingBar: boolean = true): Promise<void> {
    return new Promise<void>((resolve) => {
      if (showLoadingBar) {
        this.startLoading();
      }
      if (this.getConnection().isDisconnected()) {
        // this.notifications.info('Database', 'Reconnecting...');
        this.logger.warn('Database', 'Reconnecting...');
        this.getConnection().onOpen(async () => {
          if (reInitOnBadConnection) {
            const filters: Filter[] = [];
            const errors: string[] = [];
            this.filters.collectFilters(filters, errors);
            this.logger.debug('Collected filters', filters);

            if (errors.length === 0) {
              const ifilters = FiltersService.unpackFilters(filters);
              const reInitResponse = await this.getConnection().sendMessage({
                action: SearchTableWebSocketActions.SEARCH,
                data:   new WebSocketRequestData()
                          .add('filters', ifilters)
                          .add('sort', this.sortRule.toString())
                          .add('page', this.page)
                          .add('pageSize', this.pageSize)
                          .add('reconnect', true)
                          .unpack()
              });
              this.logger.debug('Search reconnected', reInitResponse);
            } else {
              errors.forEach((error: string) => {
                this.notifications.error('Filters error', error);
              });
            }
          }
          resolve();
        });
        this.getConnection().onError(() => {
          // noinspection JSIgnoredPromiseFromCall
          this.checkConnection();
        });
        const reconnectSuccess = this.getConnection().reconnect();
        if (!reconnectSuccess) {
          this.notifications.error(
            'Database',
            'Unable to reconnect, server is unreachable. Please refresh the page and try again.',
            1000 * 60 * 60 * 24 // tslint:disable-line:no-magic-numbers
          );
        }
      } else {
        resolve();
      }
    });
  }
}

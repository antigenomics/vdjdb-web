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
  private forceSearchEventSubscription: Subscription;

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

    this.forceSearchEventSubscription = this.searchTableService.getEvents().pipe(filter((event) => {
      return event === SearchTableServiceEvents.FORCE_SEARCH;
    })).subscribe(() => {
      this.update();
    })
  }

  public getRows(): SearchTableRow[] {
    return this.rows;
  }

  public async update(): Promise<void> {
    if (this.loading) {
      this.notifications.warn('Search', 'A search is already running, please wait for it to finish');
      return;
    }

    // try/finally around everything after the guard. Whatever goes wrong in here - a frame that is not
    // a result, a socket that will not open, a filter that throws while being collected - `loading` has
    // to come back down, because it is what gates every future search on this page. Without it one
    // failure is permanent and presents as the guard message above, which describes a search that is
    // not running.
    try {
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
        if (this.updateFromResponse(response)) {
          this.sortRule.clear();
        }
      } else {
        errors.forEach((error: string) => {
          this.notifications.error('Filters error', error);
        });
      }
    } finally {
      this.stopLoading();
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
    this.setExportStartStatus();
    const response = await this.getConnection().sendMessage({
      action: SearchTableWebSocketActions.EXPORT,
      data:   new WebSocketRequestData()
                .add('format', format.name)
                .add('options', options)
                .unpack()
    });
    this.logger.debug('Export', response);
    this.setExportEndStatus();
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
    this.forceSearchEventSubscription.unsubscribe();
  }

  private getConnection(): WebSocketConnection {
    return this.searchTableService.getConnection();
  }

  /** Applies a search result, or reports that the frame was not one.
   *
   * Not every frame that satisfies `sendMessage` carries a page of rows. `sendMessage` filters out
   * WARNING frames but not ERROR ones, so a server-side `errorMessage` resolves the same promise a
   * result would; the reconnect path answers with a bare `handshake()`, which has no data at all; and
   * when the socket will not accept the message `sendMessage` resolves `{ status: 'error' }` itself.
   *
   * This used to read `response.get('rows').map(...)` unguarded, which made all three a TypeError
   * thrown out of `update()` past its `stopLoading()`. `loading` then stayed true for the lifetime of
   * the page and every later search was refused with "A search is already running" - a permanent stall
   * from one transient frame, and the message pointed at a search that had never started.
   *
   * @returns whether the response actually contained a page
   */
  private updateFromResponse(response: WebSocketResponseData): boolean {
    const rows = response.get('rows');
    if (rows === undefined || rows === null) {
      const reason = response.get('message');
      this.logger.warn('Search', reason || 'Response carried no rows');
      if (reason) {
        this.notifications.error('Search', reason);
      }
      // Here rather than in each caller: the success path clears `loading` inside `updateRows`, so
      // `sort`, `changePage` and `changePageSize` never call `stopLoading` themselves and would each
      // strand the flag on this branch.
      this.stopLoading();
      return false;
    }
    const page = response.get('page');
    const pageSize = response.get('pageSize');
    const pageCount = response.get('pageCount');
    const recordsFound = response.get('recordsFound');
    this.updateTable(page, pageSize, rows.map((row: any) => new SearchTableRow(row)), pageCount);
    this.updateRecordsFound(recordsFound);
    return true;
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

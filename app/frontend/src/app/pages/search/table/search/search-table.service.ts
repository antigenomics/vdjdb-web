/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { Injectable } from '@angular/core';
import { Filter, FiltersOptions, IFilter } from '../../../../shared/filters/filters';
import { FiltersService } from '../../../../shared/filters/filters.service';
import { ExportFormat } from '../../../../shared/table/export/table-export.component';
import { Table, TableEvent } from '../../../../shared/table/table';
import { WebSocketConnection, WebSocketResponseStatus } from '../../../../shared/websocket/websocket-connection';
import { WebSocketRequestData } from '../../../../shared/websocket/websocket-request';
import { WebSocketResponseData } from '../../../../shared/websocket/websocket-response';
import { LoggerService } from '../../../../utils/logger/logger.service';
import { NotificationService } from '../../../../utils/notifications/notification.service';
import { Utils } from '../../../../utils/utils';
import { DatabaseColumnInfo, DatabaseMetadata } from '../../database/database-metadata';
import { SearchTableRow } from './row/search-table-row';

export namespace SearchTableWebSocketActions {
    export const METADATA: string = 'meta';
    export const SUGGESTIONS: string = 'suggestions';
    export const SEARCH: string = 'search';
    export const EXPORT: string = 'export';
    export const PAIRED: string = 'paired';
}

@Injectable()
export class SearchTableService extends Table<SearchTableRow> {
    private _initialized: boolean = false;
    private _filters: IFilter[] = [];
    private _columns: DatabaseColumnInfo[] = [];
    private _recordsFound: number = 0;
    private _numberOfRecords: number = 0;

    private connection: WebSocketConnection;

    constructor(private filters: FiltersService, private logger: LoggerService, private notifications: NotificationService) {
        super();
        this.connection = new WebSocketConnection(logger, notifications, false);
        this.connection.onOpen(async () => {
            const metadataRequest = this.connection.sendMessage({
                action: SearchTableWebSocketActions.METADATA
            });

            const suggestionsRequest = this.connection.sendMessage({
                action: SearchTableWebSocketActions.SUGGESTIONS,
                data:   new WebSocketRequestData()
                        .add('column', 'antigen.epitope')
                        .unpack()
            });

            const metadataResponse = await metadataRequest;
            this.logger.debug('Metadata', metadataResponse);
            const metadata = DatabaseMetadata.deserialize(metadataResponse.get('metadata'));
            const columns = metadata.columns;
            const metadataOptions = new FiltersOptions();
            metadataOptions.add('tcr.segments.vSegmentValues', metadata.getColumnInfo('v.segm').values);
            metadataOptions.add('tcr.segments.jSegmentValues', metadata.getColumnInfo('j.segm').values);
            metadataOptions.add('ag.origin.speciesValues', metadata.getColumnInfo('antigen.species').values);
            metadataOptions.add('ag.origin.genesValues', metadata.getColumnInfo('antigen.gene').values);
            metadataOptions.add('ag.epitope.epitopeValues', metadata.getColumnInfo('antigen.epitope').values);
            metadataOptions.add('mhc.haplotype.firstChainValues', metadata.getColumnInfo('mhc.a').values);
            metadataOptions.add('mhc.haplotype.secondChainValues', metadata.getColumnInfo('mhc.b').values);
            metadataOptions.add('meta.general.referencesValues', metadata.getColumnInfo('reference.id').values);
            this._columns = columns;
            this._numberOfRecords = metadata.numberOfRecords;
            this.filters.setOptions(metadataOptions.unpack());

            // noinspection JSIgnoredPromiseFromCall
            this.update();

            const suggestionResponse = await suggestionsRequest;
            this.logger.debug('Suggestions', suggestionResponse);
            const suggestionsOptions = new FiltersOptions();
            suggestionsOptions.add('ag.epitope.epitopeSuggestions', suggestionResponse.get('suggestion'));
            this.filters.setOptions(suggestionsOptions.unpack());

            this._initialized = true;
            this.events.next(TableEvent.INITIALIZED);
        });
        this.connection.connect('/api/database/connect');
    }

    public isInitialized(): boolean {
        return this._initialized;
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
            this._filters = FiltersService.unpackFilters(filters);
            const response = await this.connection.sendMessage({
                action: SearchTableWebSocketActions.SEARCH,
                data:   new WebSocketRequestData()
                        .add('filters', this._filters)
                        .add('pageSize', this.pageSize)
                        .unpack()
            });

            this.logger.debug('Search', response);
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
        const response = await this.connection.sendMessage({
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
        const response = await this.connection.sendMessage({
            action: SearchTableWebSocketActions.SEARCH,
            data:   new WebSocketRequestData()
                    .add('page', page)
                    .unpack()
        });
        this.logger.debug('Page change', response);
        this.updateFromResponse(response);
    }

    public async exportTable(format: ExportFormat): Promise<void> {
        await this.checkConnection(true, false);
        this.logger.debug('Export', format);
        const response = await this.connection.sendMessage({
            action: SearchTableWebSocketActions.EXPORT,
            data:   new WebSocketRequestData()
                    .add('format', format.name)
                    .unpack()
        });
        this.logger.debug('Export', response);
        if (response.get('status') === WebSocketResponseStatus.SUCCESS) {
            Utils.File.download(response.get('link'));
        } else {
            this.notifications.warn('Export', response.get('message'));
        }
    }

    // noinspection JSMethodCanBeStatic
    public getAvailableExportFormats(): ExportFormat[] {
        return [ new ExportFormat('tab-delimited-txt', 'TAB-delimited txt') ];
    }

    public async changePageSize(pageSize: number): Promise<void> {
        await this.checkConnection();
        this.startLoading();
        this.logger.debug('Page size', pageSize);
        const response = await this.connection.sendMessage({
            action: SearchTableWebSocketActions.SEARCH,
            data:   new WebSocketRequestData()
                    .add('pageSize', pageSize)
                    .unpack()
        });
        this.logger.debug('Page size', response);
        this.updateFromResponse(response);
    }

    public async getPaired(pairedID: string, gene: string): Promise<WebSocketResponseData> {
        this.logger.debug('Paired', { pairedID, gene });
        await this.checkConnection(true, false);
        return this.connection.sendMessage({
            action: SearchTableWebSocketActions.PAIRED,
            data:   new WebSocketRequestData()
                    .add('pairedID', pairedID)
                    .add('gene', gene)
                    .unpack()
        });
    }

    public async checkConnection(reInitOnBadConnection: boolean = true, showLoadingBar: boolean = true): Promise<void> {
        return new Promise<void>((resolve) => {
            if (showLoadingBar) {
                this.startLoading();
            }
            if (this.connection.isDisconnected()) {
                this.notifications.info('Database', 'Reconnecting...');
                this.logger.warn('Database', 'Reconnecting...');
                this.connection.onOpen(async () => {
                    if (reInitOnBadConnection) {
                        const reInitResponse = await this.connection.sendMessage({
                            action: SearchTableWebSocketActions.SEARCH,
                            data:   new WebSocketRequestData()
                                    .add('filters', this._filters)
                                    .add('sort', this.sortRule.toString())
                                    .add('page', this.page)
                                    .add('pageSize', this.pageSize)
                                    .add('reconnect', true)
                                    .unpack()
                        });
                        this.logger.debug('Search reconnected', reInitResponse);
                        resolve();
                    } else {
                        resolve();
                    }
                });
                const reconnectSuccess = this.connection.reconnect();
                if (!reconnectSuccess) {
                    this.notifications.error('Database', 'Unable to reconnect, please check your internet connection');
                }
            } else {
                resolve();
            }
        });
    }

    private updateFromResponse(response: WebSocketResponseData): void {
        const page = response.get('page');
        const pageSize = response.get('pageSize');
        const rows = response.get('rows').map((row: any) => new SearchTableRow(row));
        const pageCount = response.get('pageCount');
        this.updateTable(page, pageSize, rows, pageCount);
        this._recordsFound = response.get('recordsFound');
    }

    get recordsFound(): number {
        return this._recordsFound;
    }

    get numberOfRecords(): number {
        return this._numberOfRecords;
    }

    get columns(): DatabaseColumnInfo[] {
        return this._columns;
    }
}

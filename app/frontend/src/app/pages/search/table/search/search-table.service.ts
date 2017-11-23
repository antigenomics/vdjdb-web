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

import { EventEmitter, Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Filter, FiltersOptions, IFilter } from '../../../../shared/filters/filters';
import { FiltersService } from '../../../../shared/filters/filters.service';
import { WebSocketRequestData } from '../../../../shared/websocket/websocket-request';
import { WebSocketResponseData } from '../../../../shared/websocket/websocket-response';
import { WebSocketResponseStatus, WebSocketService } from '../../../../shared/websocket/websocket.service';
import { LoggerService } from '../../../../utils/logger/logger.service';
import { NotificationService } from '../../../../utils/notification/notification.service';
import { Utils } from '../../../../utils/utils';
import { DatabaseColumnInfo, DatabaseMetadata } from '../../database/database-metadata';
import { ExportFormat } from './export/search-table-export.component';
import { SearchTableRow } from './row/search-table-row';

export namespace SearchTableWebSocketActions {
    export const METADATA: string = 'meta';
    export const SUGGESTIONS: string = 'suggestions';
    export const SEARCH: string = 'search';
    export const EXPORT: string = 'export';
    export const PAIRED: string = 'paired';
}

export class SortRule {
    public column: string = '';
    public type: 'asc' | 'desc' | 'none' = 'none';

    public toString(): string {
        return `${this.column}:${this.type}`;
    }
}

@Injectable()
export class SearchTableService {
    private _loading: boolean = false;

    private _dirty: boolean = false;
    private _filters: IFilter[] = [];
    private _page: number = 0;
    private _pageSize: number = 25;
    private _pageRange: number = 5;
    private _pageCount: number = 0;
    private _rows: Subject<SearchTableRow[]> = new ReplaySubject(1);
    private _columns: DatabaseColumnInfo[] = [];
    private _sortRule = new SortRule();
    private _recordsFound: number = 0;
    private _numberOfRecords: number = 0;
    private _updateEvent = new EventEmitter();

    private connection: WebSocketService;

    constructor(private filters: FiltersService, private logger: LoggerService, private notifications: NotificationService) {
        this.connection = new WebSocketService(logger);
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
        });
        this.connection.connect('/api/database/connect');
    }

    public async update(): Promise<void> {
        if (this._loading) {
            this.notifications.warn('Search', 'Loading');
            return;
        }

        await this.checkConnection(false);

        const filters: Filter[] = [];
        const errors: string[] = [];
        this.filters.collectFilters(filters, errors);
        this.logger.debug('Collected filters', filters);

        if (errors.length === 0) {
            this._loading = true;
            this._filters = FiltersService.unpackFilters(filters);
            const response = await this.connection.sendMessage({
                action: SearchTableWebSocketActions.SEARCH,
                data:   new WebSocketRequestData()
                        .add('filters', this._filters)
                        .add('pageSize', this._pageSize)
                        .unpack()
            });

            this.logger.debug('Search', response);
            this.updateFromResponse(response);
            this.clearSortRule();
        } else {
            errors.forEach((error: string) => {
                this.notifications.error('Filters error', error);
            });
            this._loading = false;
        }
    }

    public async sort(column: string, sameSort: boolean = false): Promise<void> {
        await this.checkConnection();
        this._loading = true;
        if (this._sortRule.column === column && !sameSort) {
            this._sortRule.type = (this._sortRule.type === 'desc') ? 'asc' : 'desc';
        } else {
            this._sortRule.column = column;
            this._sortRule.type = 'desc';
        }
        this.logger.debug('Sort rule', this._sortRule);
        const response = await this.connection.sendMessage({
            action: SearchTableWebSocketActions.SEARCH,
            data:   new WebSocketRequestData()
                    .add('sort', this._sortRule.toString())
                    .unpack()
        });
        this.logger.debug('Sort', response);
        this.updateFromResponse(response);
    }

    public async pageChange(page: number): Promise<void> {
        await this.checkConnection();
        this._loading = true;
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
        this._loading = true;
        this._pageSize = pageSize;
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

    // noinspection JSMethodCanBeStatic
    public getAvailablePageSizes(): number[] {
        return [ 25, 50, 100 ]; // tslint:disable-line:no-magic-numbers
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

    public isEmpty(): boolean {
        return this._dirty && this._recordsFound === 0;
    }

    public async checkConnection(reInitOnBadConnection: boolean = true, showLoadingBar: boolean = true): Promise<void> {
        return new Promise<void>((resolve) => {
            if (showLoadingBar) {
                this._loading = true;
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
                                    .add('sort', this._sortRule.toString())
                                    .add('page', this._page)
                                    .add('pageSize', this._pageSize)
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
        this._page = response.get('page');
        this._pageSize = response.get('pageSize');
        this._pageCount = response.get('pageCount');
        this._recordsFound = response.get('recordsFound');
        this._rows.next(response.get('rows').map((row: any) => new SearchTableRow(row)));
        this._dirty = true;
        this._loading = false;
        this._updateEvent.emit();
    }

    private clearSortRule(): void {
        this._sortRule.column = '';
        this._sortRule.type = 'none';
    }

    get loading(): boolean {
        return this._loading;
    }

    get page(): number {
        return this._page;
    }

    get pageSize(): number {
        return this._pageSize;
    }

    get pageRange(): number {
        return this._pageRange;
    }

    get pageCount(): number {
        return this._pageCount;
    }

    get recordsFound(): number {
        return this._recordsFound;
    }

    get sortRule(): SortRule {
        return this._sortRule;
    }

    get numberOfRecords(): number {
        return this._numberOfRecords;
    }

    get rows(): Subject<SearchTableRow[]> {
        return this._rows;
    }

    get columns(): DatabaseColumnInfo[] {
        return this._columns;
    }

    get dirty(): boolean {
        return this._dirty;
    }

    get updateEvent() {
        return this._updateEvent;
    }
}

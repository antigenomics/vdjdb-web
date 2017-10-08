import { EventEmitter, Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { DatabaseColumnInfo, DatabaseMetadata } from '../../../database/database-metadata';
import { LoggerService } from '../../../utils/logger/logger.service';
import { NotificationService } from '../../../utils/notification/notification.service';
import { Utils } from '../../../utils/utils';
import { Filter, FiltersOptions, IFilter } from '../../filters/filters';
import { FiltersService } from '../../filters/filters.service';
import { WebSocketRequestData } from '../../websocket/websocket-request';
import { WebSocketResponseData } from '../../websocket/websocket-response';
import { WebSocketService } from '../../websocket/websocket.service';
import { ExportFormat } from './export/search-table-export.component';
import { SearchTableRow } from './row/search-table-row';
import { Observer } from 'rxjs/Observer';

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

    constructor(private connection: WebSocketService, private filters: FiltersService,
                private logger: LoggerService, private notifications: NotificationService) {
        this.connection.connect('/api/database/connect');
        this.connection.onOpen(() => {
            const metadataRequest = this.connection.sendMessage({
                action: SearchTableWebSocketActions.METADATA
            });
            metadataRequest.subscribe({
                next: (response: WebSocketResponseData) => {
                    const metadata = DatabaseMetadata.deserialize(response.get('metadata'));
                    const columns = metadata.columns;
                    const options = new FiltersOptions();
                    options.add('tcr.segments.vSegmentValues', metadata.getColumnInfo('v.segm').values);
                    options.add('tcr.segments.jSegmentValues', metadata.getColumnInfo('j.segm').values);
                    options.add('ag.origin.speciesValues', metadata.getColumnInfo('antigen.species').values);
                    options.add('ag.origin.genesValues', metadata.getColumnInfo('antigen.gene').values);
                    options.add('ag.epitope.epitopeValues', metadata.getColumnInfo('antigen.epitope').values);
                    options.add('mhc.haplotype.firstChainValues', metadata.getColumnInfo('mhc.a').values);
                    options.add('mhc.haplotype.secondChainValues', metadata.getColumnInfo('mhc.b').values);
                    options.add('meta.general.referencesValues', metadata.getColumnInfo('reference.id').values);
                    this._columns = columns;
                    this._numberOfRecords = metadata.numberOfRecords;
                    this.filters.setOptions(options.unpack());
                    this.update();
                }
            });

            const suggestionsRequest = this.connection.sendMessage({
                action: SearchTableWebSocketActions.SUGGESTIONS,
                data:   new WebSocketRequestData()
                        .add('column', 'antigen.epitope')
                        .unpack()
            });
            suggestionsRequest.subscribe({
                next: (response: WebSocketResponseData) => {
                    this.logger.debug('Suggestions', response);
                    const options = new FiltersOptions();
                    options.add('ag.epitope.epitopeSuggestions', response.get('suggestion'));
                    this.filters.setOptions(options.unpack());
                }
            });
        });
        this.connection.onClose(() => {
            this.notifications.warn('Search', 'Debug disconnected');
        });
    }

    public update(): void {
        if (this._loading) {
            this.notifications.warn('Search', 'Loading');
            return;
        }

        this.checkConnection(() => {
            const filters: Filter[] = [];
            const errors: string[] = [];

            this.filters.collectFilters(filters, errors);
            if (errors.length === 0) {
                this._loading = true;
                this._filters = filters.map((filter: Filter): IFilter => filter.unpack());
                this.logger.debug('Collected filters', filters);
                const request = this.connection.sendMessage({
                    action: SearchTableWebSocketActions.SEARCH,
                    data:   new WebSocketRequestData()
                            .add('filters', this._filters)
                            .add('pageSize', this._pageSize)
                            .unpack()
                });
                request.subscribe((response: WebSocketResponseData) => {
                    this.logger.debug('Search', response);
                    this.updateFromResponse(response);
                    this.clearSortRule();
                });
            } else {
                errors.forEach((error: string) => {
                    this.notifications.error('Filters error', error);
                });
                this._loading = false;
            }
        }, false);
    }

    public sort(column: string, sameSort: boolean = false): void {
        this.checkConnection(() => {
            this._loading = true;
            if (this._sortRule.column === column && !sameSort) {
                this._sortRule.type = (this._sortRule.type === 'desc') ? 'asc' : 'desc';
            } else {
                this._sortRule.column = column;
                this._sortRule.type = 'desc';
            }
            this.logger.debug('Sort rule', this._sortRule);
            const request = this.connection.sendMessage({
                action: SearchTableWebSocketActions.SEARCH,
                data:   new WebSocketRequestData()
                        .add('sort', this._sortRule.toString())
                        .unpack()
            });
            request.subscribe((response: WebSocketResponseData) => {
                this.logger.debug('Sort', response);
                this.updateFromResponse(response);
            });
        });
    }

    public pageChange(page: number): void {
        this.checkConnection(() => {
            this._loading = true;
            this.logger.debug('Page change', page);
            const request = this.connection.sendMessage({
                action: SearchTableWebSocketActions.SEARCH,
                data:   new WebSocketRequestData()
                        .add('page', page)
                        .unpack()
            });
            request.subscribe((response: WebSocketResponseData) => {
                this.logger.debug('Page change', response);
                this.updateFromResponse(response);
            });
        });
    }

    public exportTable(format: ExportFormat): void {
        this.checkConnection(() => {
            this.logger.debug('Export', format);
            const request = this.connection.sendMessage({
                action: SearchTableWebSocketActions.EXPORT,
                data:   new WebSocketRequestData()
                        .add('format', format.name)
                        .unpack()
            });
            request.subscribe((response: WebSocketResponseData) => {
                this.logger.debug('Export', response);
                Utils.File.download(response.get('link'));
            });
        });
    }

    // noinspection JSMethodCanBeStatic
    public getAvailableExportFormats(): ExportFormat[] {
        return [ new ExportFormat('tab-delimited-txt', 'TAB-delimited txt') ];
    }

    public changePageSize(pageSize: number): void {
        this.checkConnection(() => {
            this._loading = true;
            this._pageSize = pageSize;
            this.logger.debug('Page size', pageSize);
            const request = this.connection.sendMessage({
                action: SearchTableWebSocketActions.SEARCH,
                data:   new WebSocketRequestData()
                        .add('pageSize', pageSize)
                        .unpack()
            });
            request.subscribe((response: WebSocketResponseData) => {
                this.logger.debug('Page size', response);
                this.updateFromResponse(response);
            });
        });
    }

    // noinspection JSMethodCanBeStatic
    public getAvailablePageSizes(): number[] {
        return [ 25, 50, 100 ]; // tslint:disable-line:no-magic-numbers
    }

    public getPaired(pairedID: string, gene: string): Observable<WebSocketResponseData> {
        this.logger.debug('Paired', { pairedID, gene });
        return Observable.create((observer: Observer<WebSocketResponseData>) => {
            this.checkConnection(() => {
                const pairedRequest = this.connection.sendMessage({
                    action: SearchTableWebSocketActions.PAIRED,
                    data:   new WebSocketRequestData()
                            .add('pairedID', pairedID)
                            .add('gene', gene)
                            .unpack()
                });
                pairedRequest.subscribe((response: WebSocketResponseData) => {
                    observer.next(response);
                    observer.complete();
                });
            }, true, false);
        });
    }

    public isEmpty(): boolean {
        return this._dirty && this._recordsFound === 0;
    }

    public checkConnection(callback: () => void, init: boolean = true, loading: boolean = true): void {
        if (loading) {
            this._loading = true;
        }
        if (this.connection.isDisconnected()) {
            this.notifications.info('Database', 'Reconnecting...');
            this.logger.warn('Database', 'Reconnecting...');
            this.connection.onOpen(() => {
                if (init) {
                    const reconnectRequest = this.connection.sendMessage({
                        action: SearchTableWebSocketActions.SEARCH,
                        data:   new WebSocketRequestData()
                                .add('filters', this._filters)
                                .add('sort', this._sortRule.toString())
                                .add('page', this._page)
                                .add('pageSize', this._pageSize)
                                .add('reconnect', true)
                                .unpack()
                    });
                    reconnectRequest.subscribe((response: WebSocketResponseData) => {
                        this.logger.debug('Search reconnected', response);
                        callback();
                    });
                } else {
                    callback();
                }
            });
            const reconnectSuccess = this.connection.reconnect();
            if (!reconnectSuccess) {
                this.notifications.error('Database', 'Unable to reconnect, please check your internet connection');
            }
        } else {
            callback();
        }
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

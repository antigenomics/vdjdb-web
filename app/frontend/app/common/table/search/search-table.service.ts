import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { DatabaseColumnInfo, DatabaseMetadata } from '../../../database/database-metadata';
import { LoggerService } from '../../../utils/logger/logger.service';
import { NotificationService } from '../../../utils/notification/notification.service';
import { Filter } from '../../filters/filters';
import { FiltersService } from '../../filters/filters.service';
import { WebSocketService } from '../../websocket/websocket.service';
import { ExportFormat } from './export/search-table-export.component';
import { SearchTableRow } from './row/search-table-row';
import { Utils } from '../../../utils/utils';

export const enum SearchTableWebSocketActions {
    Metadata = 'meta',
    Search   = 'search',
    Export   = 'export'
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
    private _connectionFailed: boolean = false;
    private _loading: boolean = false;

    private _dirty: boolean = false;
    private _page: number = 0;
    private _pageSize: number = 0;
    private _pageCount: number = 0;
    private _rows: Subject<SearchTableRow[]> = new ReplaySubject(1);
    private _columns: DatabaseColumnInfo[] = [];
    private _sortRule = new SortRule();
    private _recordsFound: number = 0;
    private _numberOfRecords: number = 0;

    constructor(private connection: WebSocketService, private filters: FiltersService,
                private logger: LoggerService, private notifications: NotificationService) {
        this.connection.connect('/api/database/connect');
        this.connection.onOpen(() => {
            const metadataRequest = this.connection.sendMessage({
                action: SearchTableWebSocketActions.Metadata
            });
            metadataRequest.subscribe({
                next: (response: any) => {
                    const metadata = DatabaseMetadata.deserialize(response.metadata);
                    const columns = metadata.columns;
                    const options = {
                        tcr:  {
                            segments: {
                                vSegmentValues: metadata.getColumnInfo('v.segm').values,
                                jSegmentValues: metadata.getColumnInfo('j.segm').values
                            }
                        },
                        ag:   {
                            origin:  {
                                speciesValues: metadata.getColumnInfo('antigen.species').values,
                                genesValues:   metadata.getColumnInfo('antigen.gene').values
                            },
                            epitope: {
                                epitopeValues: metadata.getColumnInfo('antigen.epitope').values
                            }
                        },
                        mhc:  {
                            haplotype: {
                                firstChainValues:  metadata.getColumnInfo('mhc.a').values,
                                secondChainValues: metadata.getColumnInfo('mhc.b').values
                            }
                        },
                        meta: {
                            general: {
                                referencesValues: metadata.getColumnInfo('reference.id').values
                            }
                        }
                    };
                    this._columns = columns;
                    this._numberOfRecords = metadata.numberOfRecords;
                    this.filters.setOptions(options);
                    this.update();
                }
            });
        });
        this.connection.onClose(() => {
            this.notifications.warn('Search', 'Trying to reconnect to database');
            const reconnectSuccess = this.connection.reconnect();
            if (!reconnectSuccess) {
                this._connectionFailed = true;
                this.notifications.error('Search', 'Reconnect failed');
            }
        });
    }

    public update(): void {
        if (this._loading) {
            this.notifications.warn('Search', 'Loading');
            return;
        }

        const filters: Filter[] = [];
        const errors: string[] = [];

        this.filters.collectFilters(filters, errors);
        if (errors.length === 0) {
            this._loading = true;
            this.logger.debug('Collected filters', filters);
            const request = this.connection.sendMessage({
                action: SearchTableWebSocketActions.Search,
                data:   {
                    filters
                }
            });
            request.subscribe((response: any) => {
                this.logger.debug('Search', response);
                this.updateFromResponse(response);
                this.clearSortRule();
            });
        } else {
            errors.forEach((error: string) => {
                this.notifications.error('Filters error', error);
            });
        }
    }

    public sort(column: string, sameSort: boolean = false): void {
        this._loading = true;
        if (this._sortRule.column === column && !sameSort) {
            this._sortRule.type = (this._sortRule.type === 'desc') ? 'asc' : 'desc';
        } else {
            this._sortRule.column = column;
            this._sortRule.type = 'desc';
        }
        this.logger.debug('Sort rule', this._sortRule);
        const request = this.connection.sendMessage({
            action: SearchTableWebSocketActions.Search,
            data:   {
                sort: this._sortRule.toString()
            }
        });
        request.subscribe((response: any) => {
            this.logger.debug('Sort', response);
            this.updateFromResponse(response);
        });
    }

    public pageChange(page: number): void {
        this._loading = true;
        this.logger.debug('Page change', page);
        const request = this.connection.sendMessage({
            action: SearchTableWebSocketActions.Search,
            data:   {
                page
            }
        });
        request.subscribe((response: any) => {
            this.logger.debug('Page change', response);
            this.updateFromResponse(response);
        });
    }

    public exportTable(format: ExportFormat): void {
        this.logger.debug('Export', format);
        const request = this.connection.sendMessage({
            action: SearchTableWebSocketActions.Export,
            data:   {
                format: format.name
            }
        });
        request.subscribe((response: any) => {
            this.logger.debug('Export', response);

            const name = response.name;
            const link = response.link;
            const guard = response.guard;
            const hash = response.hash;
            Utils.File.download(`/temporary/${name}/${link}/${guard}/${hash}`);
            // link: String, name: String, guard: String, hash: String
        });
    }

    // noinspection JSMethodCanBeStatic
    public getAvailableExportFormats(): ExportFormat[] {
        return [ new ExportFormat('tab-delimited-txt', 'TAB-delimited txt') ];
    }

    private updateFromResponse(response: any): void {
        this._page = response.page;
        this._pageSize = response.pageSize;
        this._pageCount = response.pageCount;
        this._recordsFound = response.recordsFound;
        this._rows.next(response.rows.map((row: any) => new SearchTableRow(row)));
        this._dirty = true;
        this._loading = false;
    }

    private clearSortRule(): void {
        this._sortRule.column = '';
        this._sortRule.type = 'none';
    }

    get loading(): boolean {
        return this._loading;
    }

    get connectionFailed(): boolean {
        return this._connectionFailed;
    }

    get page(): number {
        return this._page;
    }

    get pageSize(): number {
        return this._pageSize;
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
}

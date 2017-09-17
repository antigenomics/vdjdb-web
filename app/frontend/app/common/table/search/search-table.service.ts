import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { DatabaseColumnInfo, DatabaseMetadata } from '../../../database/database-metadata';
import { LoggerService } from '../../../utils/logger/logger.service';
import { NotificationService } from '../../../utils/notification/notification.service';
import { Filter } from '../../filters/filters';
import { FiltersService } from '../../filters/filters.service';
import { WebSocketService } from '../../websocket/websocket.service';
import { SearchTableRow } from './row/search-table-row';

export const enum SearchTableWebsocketActions {
    Metadata   = 'meta',
    Search     = 'search'
}

@Injectable()
export class SearchTableService {
    private _dirty: boolean = false;
    private _page: number = 0;
    private _pageSize: number = 0;
    private _loading: boolean = false;
    private _rows: Subject<SearchTableRow[]> = new ReplaySubject(1);
    private _columns: DatabaseColumnInfo[] = [];

    constructor(private connection: WebSocketService, private filters: FiltersService,
                private logger: LoggerService, private notifications: NotificationService) {
        this.connection.connect('/api/database/connect');
        this.connection.onOpen(() => {
            const metadataRequest = this.connection.sendMessage({
                action: SearchTableWebsocketActions.Metadata
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
                    this.filters.setOptions(options);
                    this.update();
                }
            });
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
            const message = this.connection.sendMessage({
                action: SearchTableWebsocketActions.Search,
                data:   {
                    filters
                }
            });
            message.subscribe((response: any) => {
                this.logger.debug('Search', response);
                this._page = response.page;
                this._pageSize = response.pageSize;
                this._rows.next(response.rows.map((row: any) => new SearchTableRow(row)));
                this._dirty = true;
                this._loading = false;
            });
        } else {
            errors.forEach((error: string) => {
                this.notifications.error('Filters error', error);
            });
        }

    }

    get page() {
        return this._page;
    }

    get pageSize() {
        return this._pageSize;
    }

    get loading() {
        return this._loading;
    }

    get rows() {
        return this._rows;
    }

    get columns() {
        return this._columns;
    }

    get dirty() {
        return this._dirty;
    }
}

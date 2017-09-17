import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/take';
import { Filter } from '../../common/filters/filters';
import { FiltersService } from '../../common/filters/filters.service';
import { SearchTableService } from '../../common/table/search/search-table.service';
import { WebSocketService } from '../../common/websocket/websocket.service';
import { DatabaseMetadata } from '../../database/database-metadata';
import { LoggerService } from '../../utils/logger/logger.service';
import { NotificationService } from '../../utils/notification/notification.service';

export const enum SearchPageWebsocketActions {
    Metadata   = 'meta',
    ColumnInfo = 'columnInfo',
    Search     = 'search'
}

@Component({
    selector:        'search',
    templateUrl:     './search.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchPageComponent {
    public static initialSearchTimeout = 1000;

    public loading: boolean = false;

    constructor(private filters: FiltersService, private websocket: WebSocketService,
                private table: SearchTableService, private logger: LoggerService,
                private notifications: NotificationService) {
        this.websocket.connect('/api/database/connect');
        this.websocket.onOpen(() => {
            if (!this.table.dirty) {
                const metadataRequest = this.websocket.sendMessage({
                    action: SearchPageWebsocketActions.Metadata
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
                        this.table.updateColumns(columns);
                        this.filters.setOptions(options);
                    }
                });
                setTimeout(() => {
                    this.search();
                }, SearchPageComponent.initialSearchTimeout);
            }
        });
    }

    public search(): void {
        if (!this.loading) {
            const filters: Filter[] = [];
            const errors: string[] = [];

            this.filters.collectFilters(filters, errors);
            if (errors.length === 0) {
                this.loading = true;
                this.logger.debug('Collected filters', filters);
                const message = this.websocket.sendMessage({
                    action: SearchPageWebsocketActions.Search,
                    data:   {
                        filters
                    }
                });
                message.subscribe((response: any) => {
                    this.table.update(response);
                    this.logger.debug('Search', response);
                    this.loading = false;
                });
            } else {
                errors.forEach((error: string) => {
                    this.notifications.error('Filters error', error);
                });
            }
        } else {
            this.notifications.warn('Search', 'Loading');
        }
    }

    public reset(): void {
        this.filters.setDefault();
    }

    public isLoading(): boolean {
        return this.loading || !this.table.dirty;
    }
}

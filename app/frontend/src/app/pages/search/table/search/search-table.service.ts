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
import { Observable, Subject } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { FiltersOptions } from 'shared/filters/filters';
import { FiltersService } from 'shared/filters/filters.service';
import { WebSocketConnection } from 'shared/websocket/websocket-connection';
import { WebSocketRequestData } from 'shared/websocket/websocket-request';
import { WebSocketResponseData } from 'shared/websocket/websocket-response';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';
import { DatabaseMetadata } from '../../database/database-metadata';

export type SearchTableWebSocketActions = string;

export namespace SearchTableWebSocketActions {
    export const METADATA: string = 'meta';
    export const SUGGESTIONS: string = 'suggestions';
    export const SEARCH: string = 'search';
    export const EXPORT: string = 'export';
    export const PAIRED: string = 'paired';
}

export type SearchTableServiceEvents = number;

export namespace SearchTableServiceEvents {
    export const INITIALIZED: number = 0;
    export const NEED_RECONNECT: number = 1;
    export const RECONNECTED: number = 2;
}

@Injectable()
export class SearchTableService {
    private lastResponse: WebSocketResponseData;
    private events: Subject<SearchTableServiceEvents> = new Subject();

    private initialized: boolean = false;
    private metadata: DatabaseMetadata;

    private connection: WebSocketConnection;

    constructor(private filters: FiltersService, private logger: LoggerService, notifications: NotificationService) {
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

            const metadataOptions = new FiltersOptions();
            metadataOptions.add('tcr.segments.vSegmentValues', metadata.getColumnInfo('v.segm').values);
            metadataOptions.add('tcr.segments.jSegmentValues', metadata.getColumnInfo('j.segm').values);
            metadataOptions.add('ag.origin.speciesValues', metadata.getColumnInfo('antigen.species').values);
            metadataOptions.add('ag.origin.genesValues', metadata.getColumnInfo('antigen.gene').values);
            metadataOptions.add('ag.epitope.epitopeValues', metadata.getColumnInfo('antigen.epitope').values);
            metadataOptions.add('mhc.haplotype.firstChainValues', metadata.getColumnInfo('mhc.a').values);
            metadataOptions.add('mhc.haplotype.secondChainValues', metadata.getColumnInfo('mhc.b').values);
            metadataOptions.add('meta.general.referencesValues', metadata.getColumnInfo('reference.id').values);

            this.metadata = metadata;
            this.filters.setOptions(metadataOptions.unpack());

            const suggestionResponse = await suggestionsRequest;
            this.logger.debug('Suggestions', suggestionResponse);
            const suggestionsOptions = new FiltersOptions();
            suggestionsOptions.add('ag.epitope.epitopeSuggestions', suggestionResponse.get('suggestions'));
            this.filters.setOptions(suggestionsOptions.unpack());

            this.initialized = true;
            this.events.next(SearchTableServiceEvents.INITIALIZED);
        });
        this.connection.getMessages().pipe(filter((message: WebSocketResponseData) => {
            return message.isSuccess() && message.get('action') === SearchTableWebSocketActions.SEARCH;
        })).subscribe((message: WebSocketResponseData) => {
            this.lastResponse = message;
        });
        this.connection.connect('/api/database/connect');
    }

    public isInitialized(): boolean {
        return this.initialized;
    }

    public waitInitialization(): Promise<void> {
        return new Promise<void>((resolve) => {
            if (this.isInitialized()) {
                resolve();
            } else {
                this.events.pipe(filter((event) => {
                    return event === SearchTableServiceEvents.INITIALIZED;
                }), take(1)).subscribe(() => {
                    resolve();
                });
            }
        });
    }

    public getMetadata(): DatabaseMetadata {
        return this.metadata;
    }

    public getEvents(): Observable<SearchTableServiceEvents> {
        return this.events;
    }

    public sendEvent(event: SearchTableServiceEvents): void {
        this.events.next(event);
    }

    public getConnection(): WebSocketConnection {
        return this.connection;
    }

    public getLastResponse(): WebSocketResponseData {
        return this.lastResponse;
    }

    public getPaired(pairedID: string, gene: string): Promise<WebSocketResponseData> {
        return new Promise<WebSocketResponseData>((resolve) => {
            this.logger.debug('Paired', { pairedID, gene });
            if (this.connection.isDisconnected()) {
                this.events.pipe(
                    filter((event) => event === SearchTableServiceEvents.RECONNECTED),
                    take(1)
                ).subscribe(() => {
                    resolve(this.sendPairedMessage(pairedID, gene));
                });
                this.events.next(SearchTableServiceEvents.NEED_RECONNECT);
            } else {
                resolve(this.sendPairedMessage(pairedID, gene));
            }
        });
    }

    private sendPairedMessage(pairedID: string, gene: string): Promise<WebSocketResponseData> {
        return this.connection.sendMessage({
            action: SearchTableWebSocketActions.PAIRED,
            data:   new WebSocketRequestData()
                    .add('pairedID', pairedID)
                    .add('gene', gene)
                    .unpack()
        });
    }

}

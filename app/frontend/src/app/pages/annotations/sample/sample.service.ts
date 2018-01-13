/*
 *     Copyright 2017 Bagaev Dmitry
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
 *
 */

import { Injectable } from '@angular/core';
import { AnnotationsService } from 'pages/annotations/annotations.service';
import { SampleFilters } from 'pages/annotations/sample/filters/sample-filters';
import { IntersectionTable } from 'pages/annotations/sample/table/intersection/intersection-table';
import { IntersectionTableRow } from 'pages/annotations/sample/table/intersection/row/intersection-table-row';
import { SummaryFieldCounter } from 'pages/annotations/sample/table/intersection/summary/summary-field-counter';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { SampleItem } from 'shared/sample/sample-item';
import { WebSocketResponseData } from 'shared/websocket/websocket-response';
import { NotificationService } from 'utils/notifications/notification.service';

export namespace SampleServiceUpdateState {
    export const PARSE: string = 'parse';
    export const ANNOTATE: string = 'annotate';
    export const LOADING: string = 'loading';
    export const COMPLETED: string = 'completed';
}

export type SampleServiceEventType = number;

export namespace SampleServiceEventType {
    export const EVENT_LOADING: number = 0;
    export const EVENT_SELECTED: number = 1;
    export const EVENT_UPDATED: number = 2;
}

export class SampleServiceEvent {
    public readonly name: string;
    public readonly type: SampleServiceEventType;

    constructor(name: string, type: SampleServiceEventType) {
        this.name = name;
        this.type = type;
    }
}

@Injectable()
export class SampleService {
    private _currentSample: SampleItem;
    private _events: Subject<SampleServiceEvent> = new Subject();

    constructor(private annotationsService: AnnotationsService, private notifications: NotificationService) {}

    public setCurrentSample(sample: SampleItem): void {
        this._currentSample = sample;
        this._events.next(new SampleServiceEvent(sample.name, SampleServiceEventType.EVENT_SELECTED));
    }

    public getCurrentSample(): SampleItem {
        return this._currentSample;
    }

    public async intersect(sample: SampleItem) {
        if (!sample.isProcessing()) {
            sample.setProcessingStatus(true);
            sample.setProcessingLabel('Loading');

            const table = sample.table;
            const filters = sample.filters;
            table.startLoading();

            this._events.next(new SampleServiceEvent(sample.name, SampleServiceEventType.EVENT_LOADING));
            this.annotationsService.intersect(sample, filters, (messages: Observable<WebSocketResponseData>) => {
                const messagesSubscription = messages.subscribe((response: WebSocketResponseData) => {
                    if (response.isSuccess()) {
                        const state = response.get('state');
                        switch (state) {
                            case SampleServiceUpdateState.PARSE:
                                sample.setProcessingLabel('Reading sample file (Stage 1 of 3)');
                                break;
                            case SampleServiceUpdateState.ANNOTATE:
                                sample.setProcessingLabel('Annotating (Stage 2 of 3)');
                                break;
                            case SampleServiceUpdateState.LOADING:
                                sample.setProcessingLabel('Loading (Stage 3 of 3)');
                                break;
                            case SampleServiceUpdateState.COMPLETED:
                                sample.setProcessingLabel('Completed');
                                table.update(response);
                                messagesSubscription.unsubscribe();
                                sample.setProcessingStatus(false);
                                if (this._currentSample.name !== sample.name) {
                                    this.notifications.success('Annotations', `Sample ${sample.name} has been successfully annotated`);
                                }
                                break;
                            default:
                        }
                    } else if (response.isError()) {
                        this.notifications.error('Annotations', 'Unable to annotate sample');

                        table.setError();
                        messagesSubscription.unsubscribe();
                        sample.setProcessingStatus(false);
                    }
                    this._events.next(new SampleServiceEvent(sample.name, SampleServiceEventType.EVENT_UPDATED));
                });
            });
        } else {
            this.notifications.info('Annotations', 'Sample is in proccesing state');
        }
    }

    public getEvents(): Subject<SampleServiceEvent> {
        return this._events;
    }
}

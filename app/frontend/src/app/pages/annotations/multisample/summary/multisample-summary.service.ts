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
import { SummaryCounters } from 'pages/annotations/sample/table/intersection/summary/summary-counters';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { SampleItem } from 'shared/sample/sample-item';
import { WebSocketConnection } from 'shared/websocket/websocket-connection';
import { WebSocketRequestData } from 'shared/websocket/websocket-request';
import { WebSocketResponseData } from 'shared/websocket/websocket-response';
import { LoggerService } from 'utils/logger/logger.service';
import { NotificationService } from 'utils/notifications/notification.service';

export type MultisampleSummaryServiceEvents = number;

export namespace MultisampleSummaryServiceEvents {
    export const CONNECTION_OPEN: number = 0;
    export const CONNECTION_CLOSED: number = 1;
    export const CURRENT_TAB_UPDATED: number = 2;
    export const CURRENT_TAB_CHANGED: number = 3;
}

export namespace MultisampleSummaryServiceWebSocketActions {
    export const ANNOTATE: string = 'multiple-summary';
}

export type IMultisampleSummaryAnalysisTabState = string;

export namespace IMultisampleSummaryAnalysisTabState {
    export const NOT_INITIALIZED: string = 'not-initialized';
    export const CONNECTING: string = 'connecting';
    export const COMPLETED: string = 'completed';
}

export interface IMultisampleSummaryAnalysisTab {
    id: number;
    title: string;
    dirty: boolean;
    filters: SampleFilters;
    disabled: boolean;
    samples: SampleItem[];
    state: IMultisampleSummaryAnalysisTabState;
    counters: Map<string, SummaryCounters>;
}

@Injectable()
export class MultisampleSummaryService {
    private static readonly maxTabsAvailable: number = 5;
    private static readonly tabsNames: string[] = [ 'First', 'Second', 'Third', 'Fourth', 'Fifth' ];

    private events: Subject<MultisampleSummaryServiceEvents> = new Subject();

    private tabs: IMultisampleSummaryAnalysisTab[] = [];
    private activeTab: IMultisampleSummaryAnalysisTab;

    private connected: boolean = false;
    private connectionFailed: boolean = false;
    private connection: WebSocketConnection;

    constructor(private annotationsService: AnnotationsService,
                private logger: LoggerService, private notifications: NotificationService) {
        this.connection = this.connection = new WebSocketConnection(logger, notifications, true);
        this.connection.onOpen(async () => {
            this.logger.debug('Multisample summary', 'Connected');
            this.addNewTab();
            this.connected = true;
            this.events.next(MultisampleSummaryServiceEvents.CONNECTION_OPEN);
        });

        const onConnectionFailedCallback = () => {
            this.connectionFailed = true;
            this.events.next(MultisampleSummaryServiceEvents.CONNECTION_CLOSED);
            this.notifications.error('Multisample analysis', 'Unable to connect to the server');
        };

        this.connection.onError(onConnectionFailedCallback);
        this.connection.onClose(onConnectionFailedCallback);
        // TODO Refactor so connection will be shared between multisample analysis (there is only 'summary' now)
        this.connection.connect('/api/annotations/multisample/connect');
    }

    public getEvents(): Observable<MultisampleSummaryServiceEvents> {
        return this.events.asObservable();
    }

    public isConnected(): boolean {
        return this.connected;
    }

    public isConnectionFailed(): boolean {
        return this.connectionFailed;
    }

    public reconnect(): void {
        this.connection.reconnect();
    }

    public annotate(): void {
        if (this.activeTab.samples.length < 2) {
            this.notifications.warn('Multisample analysis', 'Please select at least two different samples');
            return;
        }

        this.activeTab.state = IMultisampleSummaryAnalysisTabState.CONNECTING;

        const tabID: number = this.activeTab.id;
        const filters: SampleFilters = this.activeTab.filters;
        const sampleNames: string[] = this.activeTab.samples.map((s) => s.name);
        this.connection.subscribeMessages({
            action: MultisampleSummaryServiceWebSocketActions.ANNOTATE,
            data:   new WebSocketRequestData()
                    .add('tabID', tabID)
                    .add('sampleNames', sampleNames)
                    .add('hammingDistance', filters.hammingDistance)
                    .add('confidenceThreshold', filters.confidenceThreshold)
                    .add('matchV', filters.matchV)
                    .add('matchJ', filters.matchJ)
                    .add('species', filters.species)
                    .add('gene', filters.gene)
                    .add('mhc', filters.mhc)
                    .unpack()
        }, (messages: Observable<WebSocketResponseData>) => {
            const messagesSubscription = messages.subscribe((message) => {
                if (message.isSuccess()) {
                    const id = message.get('tabID');
                    const tab = this.getTabByID(id);

                    tab.state = message.get('state');

                    if (tab.state === IMultisampleSummaryAnalysisTabState.COMPLETED) {
                        this.logger.debug('Multisample analysis completed', message);
                        const summary = message.get('summary');

                        tab.counters.clear();
                        sampleNames.forEach((name) => {
                            const summaryCounters = summary[ name ];
                            if (summaryCounters === undefined) {
                                this.notifications.error('Multisample analysis error', `Missing data for sample ${name}`);
                            } else {
                                tab.counters.set(name, new SummaryCounters(summaryCounters));
                            }
                        });
                        messagesSubscription.unsubscribe();

                        if (this.activeTab !== tab) {
                            // TODO notify on other pages, even if this.activeTab === tab
                            this.notifications.info('Multisample analysis completed', `Tab '${tab.title}' annotated`);
                        }

                        tab.dirty = true;
                    }

                    if (this.activeTab === tab) {
                        this.events.next(MultisampleSummaryServiceEvents.CURRENT_TAB_UPDATED);
                    }
                }
            });
        });
    }

    public addNewTab(): void {
        if (this.tabs.length >= MultisampleSummaryService.maxTabsAvailable) {
            return;
        }
        this.tabs.push({
            id:       this.tabs.length + 1,
            title:    MultisampleSummaryService.tabsNames[ this.tabs.length ],
            dirty:    false,
            filters:  new SampleFilters(),
            disabled: false,
            samples:  [],
            state:    IMultisampleSummaryAnalysisTabState.NOT_INITIALIZED,
            counters: new Map()
        });
        this.activeTab = this.tabs[ this.tabs.length - 1 ];
    }

    public getTabs(): IMultisampleSummaryAnalysisTab[] {
        return this.tabs;
    }

    public setActiveTab(tab: IMultisampleSummaryAnalysisTab): void {
        this.events.next(MultisampleSummaryServiceEvents.CURRENT_TAB_CHANGED);
        this.activeTab = tab;
    }

    public isTabActive(tab: IMultisampleSummaryAnalysisTab): boolean {
        return tab === this.activeTab;
    }

    public isNewTabAllowed(): boolean {
        return this.tabs.length < MultisampleSummaryService.maxTabsAvailable;
    }

    public getCurrentTabFilters(): SampleFilters {
        return this.activeTab.filters;
    }

    public getCurrentTabState(): string {
        return this.activeTab.state;
    }

    public isCurrentTabDisabled(): boolean {
        return this.activeTab.disabled;
    }

    public isCurrentTabDirty(): boolean {
        return this.activeTab.dirty;
    }

    public getCurrentTab(): IMultisampleSummaryAnalysisTab {
        return this.activeTab;
    }

    public selectAllSamples(): void {
        this.annotationsService.getSamples().forEach((availableSample) => {
            if (!this.isSampleSelected(availableSample)) {
                this.selectSample(availableSample);
            }
        });
    }

    public deselectAllSamples(): void {
        this.activeTab.samples.splice(0, this.activeTab.samples.length);
    }

    public invertSamplesSelection(): void {
        this.annotationsService.getSamples().forEach((availableSample) => {
            this.selectSample(availableSample);
        });
    }

    public isSampleSelected(sample: SampleItem): boolean {
        return this.activeTab.samples.indexOf(sample) !== -1;
    }

    public selectSample(sample: SampleItem): void {
        const index = this.activeTab.samples.indexOf(sample);
        if (index === -1) {
            this.activeTab.samples.push(sample);
        } else {
            this.activeTab.samples.splice(index, 1);
        }
    }

    public checkTabSelectedSamples(availableSamples: SampleItem[]): void {
        this.tabs.forEach((tab: IMultisampleSummaryAnalysisTab) => {
            tab.samples = tab.samples.filter((selected) => availableSamples.indexOf(selected) !== -1);
        });
    }

    private getTabByID(id: number): IMultisampleSummaryAnalysisTab {
        return this.tabs.find((t) => t.id === id);
    }
}

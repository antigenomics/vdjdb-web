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

import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { ISampleChartComponentItem, SampleChartService, SampleChartServiceEventType } from 'pages/annotations/sample/chart/sample-chart.service';
import { SampleService, SampleServiceEventType } from 'pages/annotations/sample/sample.service';
import { SummaryClonotypeCounter } from 'pages/annotations/sample/table/intersection/summary/summary-clonotype-counter';
import { SummaryFieldCounter } from 'pages/annotations/sample/table/intersection/summary/summary-field-counter';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subject } from 'rxjs/Subject';
import { Subscription } from 'rxjs/Subscription';
import { IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { BarChartStreamType, IBarChartHorizontalDataEntry } from 'shared/charts/bar/horizontal/bar-chart-horizontal';
import { ChartEventType, IChartEvent } from 'shared/charts/chart-events';

interface INormalizeType {
    name: string;
    title: string;
    shortTitle: string;
}

interface IThresholdType {
    title: string;
    threshold: number;
}

@Component({
    selector:    'div[summary-chart]',
    templateUrl: './summary-chart.component.html'
})
export class SummaryChartComponent implements OnInit, OnDestroy {
    private static readonly normalizeTypes: INormalizeType[] = [
        { name: 'db', title: 'Normalize by number in database', shortTitle: 'Database' },
        { name: 'matches', title: 'Normalize by number of matches', shortTitle: 'Matches' }
    ];

    private static readonly thresholdTypes: IThresholdType[] = [
        { title: 'All', threshold: 10000 },
        { title: 'Top 5', threshold: 5 },
        { title: 'Top 10', threshold: 10 },
        { title: 'Top 15', threshold: 15 },
        { title: 'Top 20', threshold: 20 }
    ];

    private sampleChartServiceEventsSubscription: Subscription;

    private currentField: number = 0;
    private currentNormalizeType: INormalizeType = SummaryChartComponent.normalizeTypes[ 0 ];

    private thresholdTypesAvailable: number = 1;
    private currentThresholdType: IThresholdType = SummaryChartComponent.thresholdTypes[ 0 ];

    private isWeighted: boolean = true;
    private data: SummaryFieldCounter[];

    public stream: BarChartStreamType = new ReplaySubject(1);
    public configuration: IBarChartConfiguration = {
        axis:      {
            y: { title: 'Column values', dy: '-0.4em' },
            x: { tickFormat: '.1e', ticksCount: 5 }
        },
        grid:      true,
        container: { margin: { left: 100, right: 25, top: 20, bottom: 20 } }
    };

    public get weighted(): boolean {
        return this.isWeighted;
    }

    public set weighted(weighted: boolean) {
        this.isWeighted = weighted;
        this.updateStream();
    }

    @Input('data')
    public set setData(data: SummaryFieldCounter[]) {
        this.data = data;
        this.updateThresholdValues();
        this.updateStream();

    }

    constructor(private sampleService: SampleService, private sampleChartService: SampleChartService,
                private changeDetector: ChangeDetectorRef) {
    }

    public ngOnInit(): void {
        this.sampleChartServiceEventsSubscription = this.sampleChartService.getEvents().subscribe((event) => {
            switch (event) {
                case SampleChartServiceEventType.RESIZE_EVENT:
                    this.updateStream(true);
                    break;
                default:
                    break;
            }
        });
    }

    // Fields methods

    public getFields(): string[] {
        return this.data.map((d) => d.name);
    }

    public getCurrentFieldTitle(): string {
        return this.data[ this.currentField ].name;
    }

    public setCurrentField(index: number): void {
        this.currentField = index;
        this.updateThresholdValues();
        this.updateStream();
    }

    // Normalize type methods

    public getNormalizeTypes(): INormalizeType[] {
        return SummaryChartComponent.normalizeTypes;
    }

    public getCurrentNormalizeTypeShortTitle(): string {
        return this.currentNormalizeType.shortTitle;
    }

    public setNormalizeType(type: INormalizeType): void {
        this.currentNormalizeType = type;
        this.updateStream();
    }

    // Threshold methods

    public isThresholdTypesAvailable(): boolean {
        return this.thresholdTypesAvailable > 1;
    }

    public getThresholdTypes(): IThresholdType[] {
        return SummaryChartComponent.thresholdTypes.slice(0, this.thresholdTypesAvailable);
    }

    public getCurrentThresholdTypeTitle(): string {
        return this.currentThresholdType.title;
    }

    public setThreshold(threshold: IThresholdType): void {
        this.currentThresholdType = threshold;
        this.updateStream();
    }

    public ngOnDestroy(): void {
        this.sampleChartServiceEventsSubscription.unsubscribe();
    }

    private updateStream(resize: boolean = false): void {
        let valueConverter: (c: SummaryClonotypeCounter) => number;
        switch (this.currentNormalizeType.name) {
            case 'db':
                valueConverter = (c) => (this.isWeighted ? c.frequency : c.unique) / c.databaseUnique;
                break;
            case 'matches':
                valueConverter = (c) => (this.isWeighted ? c.frequency : c.unique) / c.unique;
                break;
            default:
                break;
        }

        let data = this.data[ this.currentField ].counters.map((c) => {
            return { name: c.field, value: valueConverter(c) };
        });

        data = data.sort((a, b) => b.value - a.value);
        if (data.length > this.currentThresholdType.threshold) {
            data = data.slice(0, this.currentThresholdType.threshold);
        }

        this.stream.next({ type: resize ? ChartEventType.RESIZE : ChartEventType.UPDATE_DATA, data: data.reverse() });
    }

    private updateThresholdValues(): void {
        this.thresholdTypesAvailable = 1;
        for (let i = 1; i < SummaryChartComponent.thresholdTypes.length; ++i) {
            if (this.data[ this.currentField ].counters.length > SummaryChartComponent.thresholdTypes[ i ].threshold) {
                this.thresholdTypesAvailable += 1;
            }
        }
        this.currentThresholdType = SummaryChartComponent.thresholdTypes[ this.thresholdTypesAvailable - 1 ];
    }
}

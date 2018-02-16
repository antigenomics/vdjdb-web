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

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { SampleChartService, SampleChartServiceEventType } from 'pages/annotations/sample/chart/sample-chart.service';
import { SummaryClonotypeCounter } from 'pages/annotations/sample/table/intersection/summary/summary-clonotype-counter';
import { SummaryFieldCounter } from 'pages/annotations/sample/table/intersection/summary/summary-field-counter';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subscription } from 'rxjs/Subscription';
import { IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { ChartStreamType } from 'shared/charts/chart';
import { ChartEventType } from 'shared/charts/chart-events';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';
import { createDefaultPieChartConfiguration, IPieChartConfiguration } from 'shared/charts/pie/pie-chart-configuration';

interface INormalizeType {
    name: string;
    title: string;
    checked: boolean;
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
        { name: 'db', title: 'number of VDJdb records', checked: true },
        { name: 'matches', title: 'number of clonotypes in sample', checked: false }
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

    private isPie: boolean = false;
    private isWeighted: boolean = true;
    private data: SummaryFieldCounter[];

    public stream: ChartStreamType = new ReplaySubject(1);
    public barChartConfiguration: IBarChartConfiguration = {
        axis:      {
            y: { title: 'Column values', dy: '-0.4em' },
            x: { tickFormat: '.1e', ticksCount: 5 }
        },
        grid:      true,
        container: { margin: { left: 100, right: 25, top: 20, bottom: 20 } }
    };
    public pieChartConfiguration: IPieChartConfiguration = createDefaultPieChartConfiguration();

    public get pie(): boolean {
        return this.isPie;
    }

    public set pie(pie: boolean) {
        this.isPie = pie;
        this.updateStream(ChartEventType.INITIAL_DATA);
    }

    public get weighted(): boolean {
        return this.isWeighted;
    }

    public set weighted(weighted: boolean) {
        this.isWeighted = weighted;
        this.updateStream(ChartEventType.UPDATE_VALUES);
    }

    @Input('data')
    public set setData(data: SummaryFieldCounter[]) {
        if (data !== undefined) {
            this.data = data;
            this.updateThresholdValues();
            this.updateStream(ChartEventType.INITIAL_DATA);
        }
    }

    constructor(private sampleChartService: SampleChartService) {}

    public ngOnInit(): void {
        this.sampleChartServiceEventsSubscription = this.sampleChartService.getEvents().subscribe((event) => {
            switch (event) {
                case SampleChartServiceEventType.RESIZE_EVENT:
                    this.updateStream(ChartEventType.RESIZE);
                    break;
                default:
                    break;
            }
        });
    }

    // Fields methods

    public getFields(): string[] {
        if (this.data === undefined) {
            return [];
        }
        return this.data.map((d) => d.name);
    }

    public getCurrentFieldTitle(): string {
        if (this.data === undefined) {
            return '';
        }
        return this.data[ this.currentField ].name;
    }

    public setCurrentField(index: number): void {
        this.currentField = index;
        this.updateThresholdValues();
        this.updateStream(ChartEventType.UPDATE_DATA);
    }

    // Normalize type methods

    public getNormalizeTypes(): INormalizeType[] {
        return SummaryChartComponent.normalizeTypes;
    }

    public setNormalizeType(type: INormalizeType): void {
        this.currentNormalizeType.checked = true;
        if (!this.isNormalizeTypeChecked(type)) {
            this.currentNormalizeType.checked = false;
            this.currentNormalizeType = type;
            this.currentNormalizeType.checked = true;
            this.updateStream(ChartEventType.UPDATE_VALUES);
        }
    }

    public isNormalizeTypeChecked(type: INormalizeType): boolean {
        return this.currentNormalizeType === type;
    }

    // Threshold methods
    public trackThresholdFn(_index: number, threshold: IThresholdType) {
        return threshold.threshold;
    }

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
        this.updateStream(ChartEventType.UPDATE_DATA);
    }

    public ngOnDestroy(): void {
        this.sampleChartServiceEventsSubscription.unsubscribe();
    }

    private updateStream(type: ChartEventType): void {
        this.stream.next({ type, data: this.createData() });
    }

    private createData(): IChartDataEntry[] {
        if (this.data === undefined) {
            return [];
        }
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
        return data.reverse();
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

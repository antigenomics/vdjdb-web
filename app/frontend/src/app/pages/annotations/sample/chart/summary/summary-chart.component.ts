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

import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { SampleChartService, SampleChartServiceEventType } from 'pages/annotations/sample/chart/sample-chart.service';
import { SummaryClonotypeCounter } from 'pages/annotations/sample/table/intersection/summary/summary-clonotype-counter';
import { SummaryCounters } from 'pages/annotations/sample/table/intersection/summary/summary-counters';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subscription } from 'rxjs/Subscription';
import { IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { ChartStreamType } from 'shared/charts/chart';
import { ChartEventType } from 'shared/charts/chart-events';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';
import { IPieChartConfiguration } from 'shared/charts/pie/pie-chart-configuration';

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
    selector:        'div[summary-chart]',
    templateUrl:     './summary-chart.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryChartComponent implements OnInit, OnDestroy {
    private static readonly thresholdTypes: IThresholdType[] = [
        { title: 'All', threshold: 10000 },
        { title: 'Top 5', threshold: 5 },
        { title: 'Top 10', threshold: 10 },
        { title: 'Top 15', threshold: 15 },
        { title: 'Top 20', threshold: 20 }
    ];

    private sampleChartServiceEventsSubscription: Subscription;

    private currentField: number = 0;
    private normalizeTypes: INormalizeType[] = [
        { name: 'db', title: 'number of VDJdb records', checked: true },
        { name: 'matches', title: 'number of clonotypes in sample', checked: true }
    ];

    private thresholdTypesAvailable: number = 1;
    private currentThresholdType: IThresholdType = SummaryChartComponent.thresholdTypes[ 0 ];

    private isPie: boolean = false;
    private isNotFoundHidden: boolean = true;
    private isWeighted: boolean = true;
    private data: SummaryCounters;

    public stream: ChartStreamType = new ReplaySubject(1);
    public barChartConfiguration: IBarChartConfiguration = {
        axis:      {
            y: { title: 'Column values', dy: '-0.4em' },
            x: { tickFormat: '.1e', ticksCount: 5 }
        },
        grid:      true,
        container: { margin: { left: 100, right: 25, top: 20, bottom: 20 } },
        tooltip:   {
            value: SummaryChartComponent.tooltipValueFn
        }
    };
    public pieChartConfiguration: IPieChartConfiguration = {
        tooltip: {
            value: SummaryChartComponent.tooltipValueFn
        }
    };

    public get pie(): boolean {
        return this.isPie;
    }

    public set pie(pie: boolean) {
        this.isPie = pie;
        this.updateStream(ChartEventType.UPDATE_DATA);
    }

    public get showNotFound(): boolean {
        return !this.isNotFoundHidden;
    }

    public set showNotFound(show: boolean) {
        this.isNotFoundHidden = !show;
        this.updateStream(ChartEventType.UPDATE_DATA);
    }

    public get weighted(): boolean {
        return this.isWeighted;
    }

    public set weighted(weighted: boolean) {
        this.isWeighted = weighted;
        this.updateStream(ChartEventType.UPDATE_DATA);
    }

    @Input('data')
    public set setData(data: SummaryCounters) {
        if (data !== undefined) {
            this.data = data;
            this.updateThresholdValues();
            this.updateStream(ChartEventType.UPDATE_DATA);
        }
    }

    constructor(private sampleChartService: SampleChartService) {
    }

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
        return this.data.counters.map((d) => d.name);
    }

    public getCurrentFieldTitle(): string {
        if (this.data === undefined) {
            return '';
        }
        return this.data.counters[ this.currentField ].name;
    }

    public setCurrentField(index: number): void {
        this.currentField = index;
        this.updateThresholdValues();
        this.updateStream(ChartEventType.UPDATE_DATA);
    }

    // Normalize type methods

    public getNormalizeTypes(): INormalizeType[] {
        return this.normalizeTypes;
    }

    public switchNormalizeType(): void {
        this.updateStream(ChartEventType.UPDATE_DATA);
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

        const valueConverter: (c: SummaryClonotypeCounter) => number = (c) => {
            let value = (this.isWeighted ? c.frequency : c.unique);
            if (this.normalizeTypes[ 0 ].checked) { // db
                value = value / c.databaseUnique;
            }
            if (this.normalizeTypes[1].checked) { // matches
                value = value / c.unique;
            }
            return value;
        };

        let data: IChartDataEntry[] = this.data.counters[ this.currentField ].counters.map((c) => {
            return { name: c.field, value: valueConverter(c) };
        });

        data = data.sort((a, b) => b.value - a.value);
        if (data.length > this.currentThresholdType.threshold) {
            data = data.slice(0, this.currentThresholdType.threshold);
        }

        if (!this.isNotFoundHidden) {
            data.push({ name: 'Unannotated', value: valueConverter(this.data.notFoundCounter), color: 'rgba(40, 40, 40, 0.5)' });
        }

        return data.reverse();
    }

    private updateThresholdValues(): void {
        this.thresholdTypesAvailable = 1;
        for (let i = 1; i < SummaryChartComponent.thresholdTypes.length; ++i) {
            if (this.data.counters[ this.currentField ].counters.length > SummaryChartComponent.thresholdTypes[ i ].threshold) {
                this.thresholdTypesAvailable += 1;
            }
        }
        this.currentThresholdType = SummaryChartComponent.thresholdTypes[ this.thresholdTypesAvailable - 1 ];
    }

    private static readonly tooltipValueFn: (d: IChartDataEntry) => string = (d: IChartDataEntry) => {
        return d.value.toExponential(3);
    }
}

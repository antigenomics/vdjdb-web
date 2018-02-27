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

import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { SummaryChartOptions } from 'pages/annotations/sample/chart/summary/options/summary-chart-options.component';
import { SummaryClonotypeCounter } from 'pages/annotations/sample/table/intersection/summary/summary-clonotype-counter';
import { SummaryCounters } from 'pages/annotations/sample/table/intersection/summary/summary-counters';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { ChartStreamType } from 'shared/charts/chart';
import { ChartEventType } from 'shared/charts/chart-events';
import { IChartDataEntry } from 'shared/charts/data/chart-data-entry';
import { IPieChartConfiguration } from 'shared/charts/pie/pie-chart-configuration';
import { Utils } from 'utils/utils';

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

    private static readonly _barChartConfiguration: IBarChartConfiguration = {
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

    private static readonly _pieChartConfiguration: IPieChartConfiguration = {
        tooltip: {
            value: SummaryChartComponent.tooltipValueFn
        }
    };

    private resizeWindowListener: () => void;
    private resizeDebouncedHandler = Utils.Time.debounce(() => {
        this.updateStream(ChartEventType.RESIZE, this.options);
    });

    private isPie: boolean = false;
    private thresholdTypesAvailable: number = -1;
    private currentThresholdType: IThresholdType = SummaryChartComponent.thresholdTypes[ 0 ];
    private data: SummaryCounters;

    public options: SummaryChartOptions = new SummaryChartOptions();
    public stream: ChartStreamType = new ReplaySubject(1);

    public get barChartConfiguration(): IBarChartConfiguration {
        return SummaryChartComponent._barChartConfiguration;
    }

    public get pieChartConfiguration(): IPieChartConfiguration {
        return SummaryChartComponent._pieChartConfiguration;
    }

    public get pie(): boolean {
        return this.isPie;
    }

    public set pie(pie: boolean) {
        this.isPie = pie;
        this.updateStream(ChartEventType.UPDATE_DATA, this.options);
    }

    @Input('data')
    public set setData(data: SummaryCounters) {
        this.data = data;
        this.updateThresholdValues();
        this.updateStream(ChartEventType.UPDATE_DATA, this.options);
    }

    constructor(private renderer: Renderer2) {
    }

    public ngOnInit(): void {
        this.resizeWindowListener = this.renderer.listen('window', 'resize', this.resizeDebouncedHandler);
    }

    public handleChangeOptionsFn(options: SummaryChartOptions): void {
        this.updateStream(ChartEventType.UPDATE_DATA, options);
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
        this.updateStream(ChartEventType.UPDATE_DATA, this.options);
    }

    public ngOnDestroy(): void {
        this.resizeWindowListener();
    }

    private updateStream(type: ChartEventType, options: SummaryChartOptions): void {
        this.stream.next({ type, data: this.createData(options) });
    }

    private createData(options: SummaryChartOptions): IChartDataEntry[] {

        const valueConverter: (c: SummaryClonotypeCounter) => number = (c) => {
            let value = (options.isWeightedByReadCount ? c.frequency : c.unique);
            if (options.normalizeTypes[ 0 ].checked) { // db
                value = value / c.databaseUnique;
            }
            if (options.normalizeTypes[ 1 ].checked) { // matches
                value = value / c.unique;
            }
            return value;
        };

        const currentFieldName: string = options.fieldTypes[ options.currentFieldIndex ].name;
        const counters = this.data.counters.find((c) => c.name === currentFieldName);

        if (counters === undefined) {
            return [];
        }

        let data: IChartDataEntry[] = counters.counters.map((c) => {
            return { name: c.field, value: valueConverter(c) };
        });

        data = data.sort((a, b) => b.value - a.value);
        if (data.length > this.currentThresholdType.threshold) {
            data = data.slice(0, this.currentThresholdType.threshold);
        }

        if (options.isNotFoundVisible) {
            data.push({ name: 'Unannotated', value: valueConverter(this.data.notFoundCounter), color: 'rgba(40, 40, 40, 0.5)' });
        }

        return data.reverse();
    }

    private updateThresholdValues(): void {
        this.thresholdTypesAvailable = 1;
        const currentFieldName: string = this.options.fieldTypes[ this.options.currentFieldIndex ].name;
        for (let i = 1; i < SummaryChartComponent.thresholdTypes.length; ++i) {
            const counters = this.data.counters.find((c) => c.name === currentFieldName);
            if (counters !== undefined && counters.counters.length > SummaryChartComponent.thresholdTypes[ i ].threshold) {
                this.thresholdTypesAvailable += 1;
            }
        }
        this.currentThresholdType = SummaryChartComponent.thresholdTypes[ this.thresholdTypesAvailable - 1 ];
    }

    private static tooltipValueFn(d: IChartDataEntry): string {
        return d.value.toExponential(3);
    }
}

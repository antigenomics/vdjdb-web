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

import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export interface IThresholdType {
    title: string;
    threshold: number;
}

export interface INormalizeType {
    name: string;
    title: string;
    checked: boolean;
}

export interface ISummaryFilterFieldType {
    name: string;
    title: string;
}

export interface ISummaryChartOptionsDisableCheckboxes {
    disableIsNotFoundVisible: boolean;
    disableIsWeightedByReadCount: boolean;
}

export class SummaryChartOptions {
    public static readonly thresholdTypes: IThresholdType[] = [
        { title: 'All', threshold: 10000 },
        { title: 'Top 5', threshold: 5 },
        { title: 'Top 10', threshold: 10 },
        { title: 'Top 15', threshold: 15 },
        { title: 'Top 20', threshold: 20 },
        { title: 'Top 25', threshold: 25 },
        { title: 'Top 30', threshold: 30 }
    ];

    public normalizeTypes: INormalizeType[] = [
        { name: 'db', title: 'number of corresponding VDJdb records', checked: false },
        { name: 'matches', title: 'number of matched clonotypes in sample', checked: false }
    ];

    public fieldTypes: ISummaryFilterFieldType[] = [
        { name: 'antigen.epitope', title: 'Epitope' },
        { name: 'mhc.class', title: 'MHC class' },
        { name: 'mhc.a', title: 'MHC A' },
        { name: 'mhc.b', title: 'MHC B' },
        { name: 'antigen.species', title: 'Epitope species' },
        { name: 'antigen.gene', title: 'Epitope gene' }
    ];

    public currentThresholdType: IThresholdType = SummaryChartOptions.thresholdTypes[ 0 ];
    public currentFieldIndex: number = 0;
    public isNotFoundVisible: boolean = false;
    public isWeightedByReadCount: boolean = true;

    public getCurrentSummaryFilterFieldType(): ISummaryFilterFieldType {
        return this.fieldTypes[this.currentFieldIndex];
    }

    public updateCurrentThresholdType(availableThresholdTypes: number): void {
        this.currentThresholdType = SummaryChartOptions.thresholdTypes[availableThresholdTypes - 1];
    }
}

@Component({
    selector:        'summary-chart-options',
    templateUrl:     './summary-chart-options.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryChartOptionsComponent {
    private thresholdTypesAvailable: number = -1;

    @Input('options')
    public options: SummaryChartOptions;

    @Input('disableCheckboxes')
    public disableCheckboxes: ISummaryChartOptionsDisableCheckboxes = { disableIsNotFoundVisible: false, disableIsWeightedByReadCount: false };

    @Output('onOptionsChange')
    public onOptionsChange = new EventEmitter();

    @Input('threshold')
    public set threshold(threshold: number) {
        this.thresholdTypesAvailable = threshold;
        this.options.updateCurrentThresholdType(threshold);
    }

    public get isNotFoundVisible(): boolean {
        return this.options.isNotFoundVisible;
    }

    public set isNotFoundVisible(isVisible: boolean) {
        this.options.isNotFoundVisible = isVisible;
        this.onOptionsChange.emit(this.options);
    }

    public get isWeightedByReadCount(): boolean {
        return this.options.isWeightedByReadCount;
    }

    public set isWeightedByReadCount(isWeighted: boolean) {
        this.options.isWeightedByReadCount = isWeighted;
        this.onOptionsChange.emit(this.options);
    }

    // Normalize type methods
    public normalizeTypeChangeFn(checked: boolean, type: INormalizeType): void {
        type.checked = checked;
        this.onOptionsChange.emit(this.options);
    }

    // Field methods
    public getCurrentFieldTitle(): string {
        return this.options.fieldTypes[this.options.currentFieldIndex].title;
    }

    public getSummaryFilterFields(): ISummaryFilterFieldType[] {
        return this.options.fieldTypes;
    }

    public setCurrentSummaryFilterField(index: number): void {
        this.options.currentFieldIndex = index;
        this.onOptionsChange.emit(this.options);
    }

    // Threshold methods
    public trackThresholdFn(_index: number, threshold: IThresholdType) {
        return threshold.threshold;
    }

    public isThresholdTypesAvailable(): boolean {
        return this.thresholdTypesAvailable > 1;
    }

    public getThresholdTypes(): IThresholdType[] {
        return SummaryChartOptions.thresholdTypes.slice(0, this.thresholdTypesAvailable);
    }

    public getCurrentThresholdTypeTitle(): string {
        return this.options.currentThresholdType.title;
    }

    public setThreshold(threshold: IThresholdType): void {
        this.options.currentThresholdType = threshold;
        this.onOptionsChange.emit(this.options);
    }
}

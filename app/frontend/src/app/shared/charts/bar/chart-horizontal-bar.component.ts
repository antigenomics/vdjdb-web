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

import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import * as d3 from 'external/d3';
import { ChartComponent } from 'shared/charts/chart.component';

@Component({
    selector: 'chart-horizontal-bar',
    template: '<div #chartContainer></div>'
})
export class ChartHorizontalBarComponent extends ChartComponent implements AfterViewInit {
    @ViewChild('chartContainer', { read: ElementRef })
    public chartContainer: ElementRef;

    public ngAfterViewInit(): void {
        d3.select(this.chartContainer.nativeElement);
    }
}

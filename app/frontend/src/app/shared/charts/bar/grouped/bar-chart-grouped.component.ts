/*
 *     Copyright 2017-2019 Bagaev Dmitry
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
 */

import { AfterViewInit, Component, ElementRef, Input, NgZone, OnDestroy, ViewChild } from '@angular/core';
import { createDefaultBarChartConfiguration, IBarChartConfiguration } from 'shared/charts/bar/bar-chart-configuration';
import { ChartInputGroupedStreamType } from 'shared/charts/chart';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { Configuration } from 'utils/configuration/configuration';
import { BarChartGrouped } from './bar-chart-grouped';

@Component({
  selector:  'bar-chart-grouped',
  template:  '<div #container style="width: 100%; height: 100%"></div>',
  styleUrls: [ '../bar-chart.styles.css' ]
})
export class BarChartGroupedComponent implements AfterViewInit, OnDestroy {
  private chart: BarChartGrouped;

  @Input('configuration')
  public configuration: IBarChartConfiguration = createDefaultBarChartConfiguration();

  @Input('stream')
  public stream: ChartInputGroupedStreamType;

  @ViewChild('container', { read: ElementRef })
  public containerElementRef: ElementRef;

  constructor(private ngZone: NgZone) {}

  public ngAfterViewInit(): void {
    const configuration = createDefaultBarChartConfiguration();
    Configuration.extend(configuration, this.configuration);

    const container = new ChartContainer(this.containerElementRef, configuration.container);
    this.chart = new BarChartGrouped(configuration, container, this.stream, this.ngZone);
  }

  public ngOnDestroy(): void {
    this.chart.destroy();
  }
}

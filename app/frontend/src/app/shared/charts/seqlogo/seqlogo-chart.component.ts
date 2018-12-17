/*
 *     Copyright 2017-2018 Bagaev Dmitry
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

import { Component, ElementRef, Input, NgZone, ViewChild } from '@angular/core';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { SeqLogoChart, SeqLogoChartInputStreamType } from 'shared/charts/seqlogo/seqlogo-chart';
import { createDefaultSeqLogoConfiguration, ISeqLogoChartConfiguration } from 'shared/charts/seqlogo/seqlogo-configuration';
import { Configuration } from 'utils/configuration/configuration';

@Component({
  selector: 'seqlogo-chart',
  template: '<div #container style="width: 100%; height: 100%"></div>'
})
export class SeqLogoChartComponent {
  private chart: SeqLogoChart;

  @Input('configuration')
  public configuration: ISeqLogoChartConfiguration = createDefaultSeqLogoConfiguration();

  @Input('stream')
  public stream: SeqLogoChartInputStreamType;

  @ViewChild('container', { read: ElementRef })
  public containerElementRef: ElementRef;

  constructor(private ngZone: NgZone) {}

  public ngAfterViewInit(): void {
    const configuration = createDefaultSeqLogoConfiguration();
    Configuration.extend(configuration, this.configuration);

    const container = new ChartContainer(this.containerElementRef, configuration.container);
    this.chart = new SeqLogoChart(configuration, container, this.stream, this.ngZone);
  }

  public ngOnDestroy(): void {
    this.chart.destroy();
  }
}
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

import { NgZone } from '@angular/core';
import { ScaleBand } from 'd3-scale';
import { event as D3CurrentEvent } from 'd3-selection';
import * as d3 from 'external/d3';
import { Observable, Subject } from 'rxjs';
import { Chart } from 'shared/charts/chart';
import { IChartEvent } from 'shared/charts/chart-events';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { createDefaultSeqLogoConfiguration, ISeqLogoChartConfiguration } from 'shared/charts/seqlogo/seqlogo-configuration';
import { Configuration } from 'utils/configuration/configuration';

export interface ISeqLogoChartCharDataEntry {
  readonly c: string;
  readonly h: number;
  readonly color?: string;
}

export interface ISeqLogoChartDataEntry {
  readonly pos: number;
  readonly chars: ISeqLogoChartCharDataEntry[];
}

export type SeqLogoChartStreamType = Subject<IChartEvent<ISeqLogoChartDataEntry>>;
export type SeqLogoChartInputStreamType = Observable<IChartEvent<ISeqLogoChartDataEntry>>;

export class SeqLogoChart extends Chart<ISeqLogoChartDataEntry, ISeqLogoChartConfiguration> {
  private static readonly defaultXMargin: number = 20;
  private static readonly defaultPadding: number = 0.3;

  // Paths and colors from https://github.com/alexpreynolds/react-seqlogo/blob/master/src/index.js
  // tslint:disable:object-literal-key-quotes max-line-length
  private static readonly paths: { [ index: string ]: string } = {
    'A': 'M 11.21875 -16.1875 L 12.296875 0 L 15.734375 0 L 10.09375 -80.265625 L 6.375 -80.265625 L 0.578125 0 L 4.015625 0 L 5.109375 -16.1875 Z M 10.296875 -29.953125 L 6.046875 -29.953125 L 8.171875 -61.328125 Z M 10.296875 -29.953125',
    'C': 'M 16.171875 -50.734375 C 16.046875 -57.375 15.734375 -61.578125 15 -65.890625 C 13.671875 -73.6875 11.546875 -78 8.953125 -78 C 4.078125 -78 1.046875 -62.53125 1.046875 -37.6875 C 1.046875 -13.046875 4.046875 2.421875 8.859375 2.421875 C 13.15625 2.421875 16.015625 -8.625 16.234375 -26.21875 L 12.78125 -26.21875 C 12.5625 -16.421875 11.171875 -10.84375 8.953125 -10.84375 C 6.203125 -10.84375 4.59375 -20.734375 4.59375 -37.46875 C 4.59375 -54.421875 6.28125 -64.53125 9.078125 -64.53125 C 10.3125 -64.53125 11.328125 -62.640625 12 -58.953125 C 12.375 -56.84375 12.5625 -54.84375 12.78125 -50.734375 Z M 16.171875 -50.734375',
    'T': 'M 10.015625 -66.734375 L 15.5625 -66.734375 L 15.5625 -80.546875 L 0.359375 -80.546875 L 0.359375 -66.734375 L 6.125 -66.734375 L 6.125 0 L 10.015625 0 Z M 10.015625 -66.734375',
    'G': 'M 16.1875 -41.375 L 9.53125 -41.375 L 9.53125 -28.1875 L 13.3125 -28.1875 C 13.234375 -23.859375 13 -21.21875 12.5 -18.46875 C 11.671875 -13.828125 10.421875 -11.078125 9.109375 -11.078125 C 6.359375 -11.078125 4.375 -22.265625 4.375 -38.109375 C 4.375 -54.671875 6.125 -64.703125 9.015625 -64.703125 C 10.203125 -64.703125 11.203125 -63.109375 11.953125 -60.0625 C 12.4375 -58.15625 12.6875 -56.359375 12.96875 -52.34375 L 16.1875 -52.34375 C 15.78125 -68.1875 13 -78.203125 9 -78.203125 C 4.21875 -78.203125 0.953125 -61.84375 0.953125 -37.890625 C 0.953125 -14.5625 4.234375 2.421875 8.71875 2.421875 C 10.953125 2.421875 12.453125 -1.265625 13.734375 -9.921875 L 14.140625 0.21875 L 16.1875 0.21875 Z M 16.1875 -41.375',
    'U': 'M 13.25 -77.953125 L 13.25 -25.125 C 13.25 -15.71875 12.0625 -11.234375 9.59375 -11.234375 C 7.125 -11.234375 5.9375 -15.71875 5.9375 -25.125 L 5.9375 -77.953125 L 2 -77.953125 L 2 -25.125 C 2 -16.359375 2.578125 -10.15625 3.859375 -5.453125 C 5.25 -0.328125 7.28125 2.453125 9.59375 2.453125 C 11.90625 2.453125 13.921875 -0.328125 15.328125 -5.453125 C 16.609375 -10.15625 17.1875 -16.359375 17.1875 -25.125 L 17.1875 -77.953125 Z M 13.25 -77.953125',
    'D': 'M 1.25 0 L 5.890625 0 C 7.703125 0 8.84375 -1.921875 9.640625 -6.265625 C 10.578125 -11.28125 11.09375 -18.578125 11.09375 -26.90625 C 11.09375 -35.15625 10.578125 -42.453125 9.640625 -47.53125 C 8.84375 -51.890625 7.71875 -53.734375 5.890625 -53.734375 L 1.25 -53.734375 Z M 3.703125 -9.21875 L 3.703125 -44.515625 L 5.890625 -44.515625 C 7.734375 -44.515625 8.640625 -38.6875 8.640625 -26.828125 C 8.640625 -15.03125 7.734375 -9.21875 5.890625 -9.21875 Z M 3.703125 -9.21875',
    'E': 'M 4.109375 -23.015625 L 10.375 -23.015625 L 10.375 -32.171875 L 4.109375 -32.171875 L 4.109375 -44.265625 L 10.875 -44.265625 L 10.875 -53.4375 L 1.421875 -53.4375 L 1.421875 0 L 11.203125 0 L 11.203125 -9.15625 L 4.109375 -9.15625 Z M 4.109375 -23.015625',
    'F': 'M 4.296875 -23.125 L 10.421875 -23.125 L 10.421875 -32.328125 L 4.296875 -32.328125 L 4.296875 -44.484375 L 11.25 -44.484375 L 11.25 -53.6875 L 1.421875 -53.6875 L 1.421875 0 L 4.296875 0 Z M 4.296875 -23.125',
    'H': 'M 8.4375 -24.3125 L 8.4375 0 L 10.9375 0 L 10.9375 -53.53125 L 8.421875 -53.53125 L 8.421875 -33.484375 L 3.625 -33.484375 L 3.625 -53.53125 L 1.125 -53.53125 L 1.125 0 L 3.625 0 L 3.625 -24.3125 Z M 8.4375 -24.3125',
    'I': 'M 6.375 -49.5625 L 10.015625 -49.5625 C 10.515625 -49.5625 10.75 -50.21875 10.75 -51.546875 C 10.75 -52.78125 10.515625 -53.453125 10.015625 -53.453125 L 1.671875 -53.453125 C 1.1875 -53.453125 0.953125 -52.78125 0.953125 -51.546875 C 0.953125 -50.21875 1.1875 -49.5625 1.671875 -49.5625 L 5.3125 -49.5625 L 5.3125 -3.890625 L 1.671875 -3.890625 C 1.1875 -3.890625 0.953125 -3.234375 0.953125 -2 C 0.953125 -0.671875 1.1875 0 1.671875 0 L 10.015625 0 C 10.484375 0 10.75 -0.671875 10.75 -2 C 10.75 -3.234375 10.515625 -3.890625 10.015625 -3.890625 L 6.375 -3.890625 Z M 6.375 -49.5625',
    'K': 'M 3.40625 -17.90625 L 4.5625 -23.625 L 8.203125 0 L 10.921875 0 L 6.015625 -30.453125 L 10.453125 -53.484375 L 7.75 -53.484375 L 3.40625 -30.015625 L 3.40625 -53.484375 L 1.125 -53.484375 L 1.125 0 L 3.40625 0 Z M 3.40625 -17.90625',
    'L': 'M 4.515625 -53.4375 L 1.5625 -53.4375 L 1.5625 0 L 11.359375 0 L 11.359375 -9.15625 L 4.515625 -9.15625 Z M 4.515625 -53.4375',
    'M': 'M 3 -41.90625 L 4.8125 0 L 6.890625 0 L 8.6875 -41.90625 L 8.6875 0 L 10.765625 0 L 10.765625 -53.78125 L 7.625 -53.78125 L 5.859375 -10.984375 L 4.03125 -53.78125 L 0.921875 -53.78125 L 0.921875 0 L 3 0 Z M 3 -41.90625',
    'N': 'M 8.46875 0 L 10.953125 0 L 10.953125 -53.6875 L 8.46875 -53.6875 L 8.46875 -17.15625 L 3.671875 -53.6875 L 1.125 -53.6875 L 1.125 0 L 3.609375 0 L 3.609375 -37.109375 Z M 8.46875 0',
    'P': 'M 3.984375 -19.140625 L 7.28125 -19.140625 C 9.65625 -19.140625 11.171875 -26.125 11.171875 -37.03125 C 11.171875 -47.765625 9.703125 -53.65625 7.015625 -53.65625 L 1.34375 -53.65625 L 1.34375 0 L 3.984375 0 Z M 3.984375 -28.34375 L 3.984375 -44.453125 L 6.453125 -44.453125 C 7.875 -44.453125 8.515625 -41.890625 8.515625 -36.359375 C 8.515625 -30.921875 7.875 -28.34375 6.453125 -28.34375 Z M 3.984375 -28.34375',
    'Q': 'M 9.234375 -6.890625 C 9.921875 -10.921875 10.34375 -17.609375 10.34375 -24.171875 C 10.34375 -31.34375 9.828125 -38.234375 8.9375 -42.859375 C 8.0625 -47.40625 6.921875 -49.625 5.46875 -49.625 C 4.03125 -49.625 2.890625 -47.40625 2.015625 -42.859375 C 1.125 -38.234375 0.59375 -31.34375 0.59375 -24.046875 C 0.59375 -16.734375 1.125 -9.84375 2.015625 -5.21875 C 2.890625 -0.671875 4.046875 1.546875 5.46875 1.546875 C 6.515625 1.546875 7.296875 0.53125 8.09375 -1.8125 L 9.296875 3.609375 L 10.34375 -1.8125 Z M 6.671875 -18.625 L 5.609375 -13.1875 L 6.6875 -8.296875 C 6.359375 -7.5 5.90625 -7.03125 5.453125 -7.03125 C 3.796875 -7.03125 2.6875 -13.796875 2.6875 -24.046875 C 2.6875 -34.28125 3.796875 -41.046875 5.46875 -41.046875 C 7.171875 -41.046875 8.265625 -34.359375 8.265625 -23.96875 C 8.265625 -19.953125 8.109375 -16.34375 7.8125 -13.390625 Z M 6.671875 -18.625',
    'R': 'M 3.765625 -21.140625 L 6.578125 -21.140625 C 7.640625 -21.140625 8.09375 -19.234375 8.09375 -14.78125 C 8.09375 -14.34375 8.09375 -13.609375 8.078125 -12.65625 C 8.0625 -11.265625 8.0625 -9.953125 8.0625 -9.140625 C 8.0625 -4.171875 8.125 -2.5625 8.4375 0 L 11.078125 0 L 11.078125 -1.96875 C 10.703125 -2.921875 10.546875 -4.03125 10.546875 -6.359375 C 10.484375 -22.09375 10.421875 -22.828125 8.90625 -25.75 C 10.234375 -28.09375 10.90625 -32.40625 10.90625 -38.921875 C 10.90625 -43.15625 10.578125 -47.046875 10.015625 -49.671875 C 9.46875 -52.15625 8.71875 -53.328125 7.703125 -53.328125 L 1.3125 -53.328125 L 1.3125 0 L 3.765625 0 Z M 3.765625 -30.28125 L 3.765625 -44.1875 L 6.71875 -44.1875 C 7.421875 -44.1875 7.71875 -43.890625 8.015625 -42.796875 C 8.3125 -41.703125 8.453125 -39.875 8.453125 -37.390625 C 8.453125 -34.828125 8.296875 -32.78125 8.015625 -31.671875 C 7.75 -30.65625 7.421875 -30.28125 6.71875 -30.28125 Z M 3.765625 -30.28125',
    'S': 'M 9.890625 -35.453125 C 9.890625 -40.140625 9.640625 -43.21875 9.0625 -46.015625 C 8.265625 -49.78125 6.9375 -51.8125 5.234375 -51.8125 C 2.375 -51.8125 0.734375 -46.078125 0.734375 -36.15625 C 0.734375 -28.25 1.65625 -24.40625 4.078125 -22.4375 L 5.734375 -21.046875 C 7.359375 -19.71875 7.96875 -17.765625 7.96875 -13.640625 C 7.96875 -9.375 7.0625 -6.78125 5.578125 -6.78125 C 3.90625 -6.78125 2.984375 -9.796875 2.90625 -15.25 L 0.515625 -15.25 C 0.671875 -4.328125 2.40625 1.609375 5.4375 1.609375 C 8.5 1.609375 10.3125 -4.546875 10.3125 -14.890625 C 10.3125 -22.9375 9.375 -27.125 7.171875 -28.953125 L 5.3125 -30.484375 C 3.5625 -31.953125 3.0625 -33.421875 3.0625 -37.125 C 3.0625 -40.96875 3.859375 -43.421875 5.125 -43.421875 C 6.671875 -43.421875 7.53125 -40.625 7.609375 -35.453125 Z M 9.890625 -35.453125',
    'V': 'M 6.25 0 L 10.1875 -53.578125 L 7.8125 -53.578125 L 5.3125 -13.234375 L 2.75 -53.578125 L 0.375 -53.578125 L 4.25 0 Z M 6.25 0',
    'W': 'M 7.78125 0 L 9.9375 -53.421875 L 8.234375 -53.421875 L 7.078125 -13.34375 L 5.8125 -53.421875 L 4.234375 -53.421875 L 3.03125 -13.40625 L 1.828125 -53.421875 L 0.140625 -53.421875 L 2.328125 0 L 3.765625 0 L 5.046875 -41.703125 L 6.34375 0 Z M 7.78125 0',
    'Y': 'M 6.59375 -19.84375 L 10.234375 -53.578125 L 7.59375 -53.578125 L 5.40625 -29.921875 L 3.0625 -53.578125 L 0.421875 -53.578125 L 4.234375 -19.84375 L 4.234375 0 L 6.59375 0 Z M 6.59375 -19.84375',
    'B': 'M7.6 0 v 71.8 h 34.9 c 17.6 0 22.1 -11.0 22.1 -18.4 c 0 -10.3 -5.8 -13.2 -8.8 -14.7 c 8.8 -3.3 11.1 -10.3 11.1 -17.4 c 0 -5.7 -2.4 -11.1 -6.2 -14.8 c -4.1 -4.0 -8.0 -6.5 -22.7 -6.5 h -30.4 z M 22.0 31.6 v -19.2 h 18.4 c 7.3 0 11.5 3.2 11.5 10.5 c 0 6.3 -5.4 8.7 -10.8 8.7 h -19.1 z M 22.0 59.4 v -15.7 h 17.6 c 5.9 0 10.6 2.3 10.6 8.0 c 0 5.9 -4.2 7.7 -11.0 7.7 h -17.2 z',
    'J': 'M484 718v-510c0 -152 -79 -226 -223 -226c-239 0 -239 152 -239 289h140c0 -113 8 -168 88 -168c78 0 84 50 84 105v510h150z',
    'O': 'M44 359c0 337 250 378 345 378s345 -41 345 -378s-250 -378 -345 -378s-345 41 -345 378zM194 359c0 -201 114 -251 195 -251s195 50 195 251s-114 251 -195 251s-195 -50 -195 -251z',
    'X': 'M419 373l234 -373h-183l-136 245l-145 -245h-175l232 367l-219 351h179l128 -232l131 232h173z',
    'Z': 'M586 127v-127h-561v127l371 464h-361v127h549v-118l-376 -473h378z'
  };

  private static readonly colors: { [ index: string ]: string } = {
    'A': '#333333',
    'C': '#21ba45',
    'T': '#21ba45',
    'G': '#21ba45',
    'D': '#f2711c',
    'E': '#f2711c',
    'F': '#333333',
    'H': '#2185d0',
    'I': '#333333',
    'K': '#2185d0',
    'L': '#333333',
    'M': '#333333',
    'N': '#a333c8',
    'P': '#333333',
    'Q': '#a333c8',
    'R': '#2185d0',
    'S': '#21ba45',
    'V': '#333333',
    'W': '#333333',
    'Y': '#21ba45'
  };

  // tslint:enable:object-literal-key-quotes max-line-length

  constructor(configuration: ISeqLogoChartConfiguration, container: ChartContainer,
              dataStream: SeqLogoChartInputStreamType, ngZone: NgZone) {
    super(configuration, container, dataStream, ngZone);
    this.container.classed('seqlogo chart');
  }

  public configure(configuration: ISeqLogoChartConfiguration): void {
    this.configuration = createDefaultSeqLogoConfiguration();
    Configuration.extend(this.configuration, configuration);
  }

  public create(data: ISeqLogoChartDataEntry[]): void {
    const { svg, width, height } = this.container.getContainer();
    const { x, xAxis } = this.createXAxis(width, data);

    svg.append('g')
      .attr('class', 'x axis')
      .attr('transform', `translate(0, ${height - SeqLogoChart.defaultXMargin})`)
      .call(xAxis);

    const mapped = data.filter((d) => d.pos >= 0).map((d) =>
      d.chars.map((c, i) => ({
        char: c,
        pos:  d.pos,
        dy:   1.0 - d.chars.slice(i + 1, d.chars.length).reduce((r, v) => r + v.h, 0.0)
      }))
    ).reduce((acc, val) => acc.concat(val), []);

    const hits = mapped.filter((d) => {
      const real = data.find((f) => f.pos === (-d.pos - 1));
      if (real !== undefined) {
        return real.chars[ 0 ].c === d.char.c;
      } else {
        return false;
      }
    });

    const elements = svg.selectAll('.box')
      .data(mapped).enter()
      .append('g')
      .attr('class', 'box')
      .attr('transform', (d) => `translate(${x(`${d.pos + 1}`)}, ${(height - SeqLogoChart.defaultXMargin) * d.dy})`)
      .append('path')
      .attr('d', (d) => SeqLogoChart.paths[ d.char.c ])
      .attr('transform', (d, i, n) => {
        const bbox = (d3.select(n[ i ]).node() as any).getBBox();
        return `scale(${x.bandwidth() / bbox.width}, ${(height - SeqLogoChart.defaultXMargin) * d.char.h / bbox.height})`;
      })
      .attr('fill', (d) => d.char.color === undefined ? SeqLogoChart.colors[ d.char.c ] : d.char.color);

    // tslint:disable:no-magic-numbers
    svg.selectAll('.hit')
      .data(hits).enter()
      .append('g')
      .attr('class', 'hit')
      .attr('transform', (d) => `translate(${x(`${d.pos + 1}`)}, ${(height - SeqLogoChart.defaultXMargin) * d.dy})`)
      .append('rect')
      .attr('x', 3)
      .attr('y', -80)
      .attr('width', 28)
      .attr('height', 80)
      .attr('fill', 'none')
      .attr('stroke', 'red')
      .attr('stroke-width', '2.5px')
      .attr('transform', (d, i, n) => {
        const bbox = (d3.select(n[ i ]).node() as any).getBBox();
        return `scale(${x.bandwidth() / bbox.width}, ${(height - SeqLogoChart.defaultXMargin) * d.char.h / bbox.height})`;
      });
    // tslint:enable:no-magic-numbers

    this.bindTooltipEvents(elements);
  }

  public update(data: ISeqLogoChartDataEntry[]): void {
    const { svg } = this.container.getContainer();
    svg.selectAll('g').remove();
    svg.selectAll('.box').remove();
    this.create(data);
  }

  public updateValues(data: ISeqLogoChartDataEntry[]): void {
    this.update(data);
  }

  public resize(data: ISeqLogoChartDataEntry[]): void {
    this.update(data);
  }

  private createXAxis(width: number, data: ISeqLogoChartDataEntry[]): { x: ScaleBand<string>, xAxis: any } {
    const x = d3.scaleBand().rangeRound([ 0, width ])
      .padding(SeqLogoChart.defaultPadding)
      .domain(Array.apply(undefined, { length: Math.max(...data.map((d) => d.pos)) + 1 }).map(Number.call, (i: number) => `${i + 1}`));

    const xAxis = d3.axisBottom(x);
    return { x, xAxis };
  }

  private bindTooltipEvents(elements: any): void {
    const xDefaultOffset = 20;
    const yDefaultOffset = -40;
    const toPercent = 100;

    elements.on('mouseover', (d: { char: { c: string, h: number }, pos: number }) => {
      this.tooltip.text(d.char.c, `Frequency: ${(d.char.h * toPercent).toFixed(2)}%`);
      this.tooltip.show();
    }).on('mouseout', () => {
      this.tooltip.hide();
    }).on('mousemove', () => {
      this.tooltip.position(D3CurrentEvent.pageX + xDefaultOffset, D3CurrentEvent.pageY + yDefaultOffset);
    });
  }
}

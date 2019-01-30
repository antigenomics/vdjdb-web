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

import * as d3 from 'external/d3';
import { D3HTMLSelection } from 'shared/charts/container/chart-container';

export class ChartTooltip {
  private readonly tooltip: D3HTMLSelection;

  constructor() {
    this.tooltip = d3.select('body').append('div');
    this.styleTooltip();
  }

  public show(): void {
    this.tooltip.style('display', 'inline-block');
  }

  public position(left: number, top: number): void {
    this.tooltip
      .style('left', `${left}px`)
      .style('top', `${top}px`);
  }

  public text(header: string, ...content: string[]): void {
    let html = `${header}<br>`;
    for (const line of content) {
      html = `${html}<span style="font-weight: 500;color: #081F2C;">${line}</span>`;
    }
    this.tooltip.html(this.replaceScriptFromHTML(html));
  }

  public hide(): void {
    this.tooltip.style('display', 'none');
  }

  public destroy(): void {
    this.tooltip.remove();
  }

  private styleTooltip(): void {
    this.tooltip
      .style('pointer-events', 'none')
      .style('position', 'absolute')
      .style('display', 'none')
      .style(' min-width', '50px')
      .style('height', 'auto')
      .style('background', 'none repeat scroll 0 0 #ffffff')
      .style('padding', '9px 14px 6px 14px')
      .style('border-radius', '4px')
      .style('text-align', 'left')
      .style('line-height', '1.3')
      .style('color', '#5B6770')
      .style('box-shadow', '0px 3px 9px rgba(0, 0, 0, .15)')
      .style('z-index', '100');
  }

  private replaceScriptFromHTML(html: string): string {
    return html.replace('script', '');
  }

}

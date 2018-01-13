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

import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { ChartEventType, IChartEvent } from 'shared/charts/chart-events';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { Utils } from 'utils/utils';

// tslint:disable-next-line:interface-name
export interface Chart<T, C> {
    configure(configuration: C): void;

    create(data: T[]): void;

    update(data: T[]): void;

    updateValues(data: T[]): void;

    resize(data: T[]): void;

    destroy(): void;
}

export class Chart<T, C> {
    private created: boolean = false;
    private dataStreamSubscription: Subscription;
    private debounceResizeListener = Utils.Time.debounce((data) => {
        this.container.recalculateContainerViewSize();
        this.resize(data);
    });

    constructor(protected configuration: C, protected container: ChartContainer,
                protected dataStream: Observable<IChartEvent<T>>) {
        this.configure(configuration);
        this.dataStreamSubscription = this.dataStream.subscribe((event) => {
            if (!this.created) {
                this.create(event.data);
                this.created = true;
            } else {
                switch (event.type) {
                    case ChartEventType.UPDATE_DATA:
                        this.update(event.data);
                        break;
                    case ChartEventType.UPDATE_VALUES:
                        this.updateValues(event.data);
                        break;
                    case ChartEventType.RESIZE:
                        this.debounceResizeListener(event.data);
                        break;
                    default:
                        break;
                }
            }
        });
    }

    public destroy(): void {
        this.container.destroy();
        if (this.dataStreamSubscription) {
            this.dataStreamSubscription.unsubscribe();
        }
    }
}

// private bindTooltipEvents(selection: D3HTMLSelection): void {
//     selection.on('mousemove', (d) => {
//         this.tooltip
//             .style('left', D3CurrentEvent.pageX - 50 + 'px')
//             .style('top', D3CurrentEvent.pageY - 120 + 'px')
//             .style('display', 'inline-block')
//             .html(`Here will be some tooltip<br>Name: ${d.name}<br>Value: ${d.value}`);
//     }).on('mouseout', (d) => {
//         this.tooltip.style('display', 'none');
//     });
// }

// this.tooltip = d3.select('body')
//                  .append('div').attr('class', 'chart-tooltip fade element')
//                  .style('position', 'absolute')
//                  .style('display', 'none')
//                  .style('min-width', '80px')
//                  .style('height', 'auto')
//                  .style('padding', '14px')
//                  .style('background', 'none repeat scroll 0 0 #ffffff')
//                  .style('border', '2px solid #48af75')
//                  .style('text-align', 'left');

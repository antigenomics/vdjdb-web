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

import { NgZone } from '@angular/core';
import { ScaleLinear, ScaleSequential } from 'd3-scale';
import * as d3 from 'external/d3';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { ChartEventType, IChartEvent } from 'shared/charts/chart-events';
import { ChartContainer } from 'shared/charts/container/chart-container';
import { ChartTooltip } from 'shared/charts/tooltip/chart-tooltip';
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

    protected tooltip: ChartTooltip;

    constructor(protected configuration: C, protected container: ChartContainer,
                protected dataStream: Observable<IChartEvent<T>>, protected ngZone: NgZone) {
        this.configure(configuration);
        this.dataStreamSubscription = this.dataStream.subscribe((event) => {
            this.ngZone.runOutsideAngular(() => {
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

        });
        this.tooltip = new ChartTooltip();
    }

    public destroy(): void {
        this.container.destroy();
        this.tooltip.destroy();
        if (this.dataStreamSubscription) {
            this.dataStreamSubscription.unsubscribe();
        }
    }

    protected getLinearColors(count: number, start: string = '#48af75', end: string = '#3897e0'): ScaleLinear<number, number> {
        return d3.scaleLinear()
                 .domain([ 0, count ])
                 .range([ start, end ] as any);
    }

    protected getRainbowColors(count: number): ScaleSequential<string> {
        return d3.scaleSequential(d3.interpolateRainbow).domain([0, count]);
    }
}

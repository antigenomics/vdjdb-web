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

import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import * as Highcharts from 'highcharts';
import { Subscription } from 'rxjs/Subscription';
import { SampleItem } from '../../../../shared/sample/sample-item';

@Component({
    selector:        'sample-chart',
    templateUrl:     './sample-chart.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleChartComponent implements OnInit, AfterViewInit {
    private _routeSampleSubscription: Subscription;

    public sample: SampleItem;

    constructor(private activatedRoute: ActivatedRoute, private changeDetector: ChangeDetectorRef) {
        this.sample = this.activatedRoute.snapshot.data.sample;
    }

    public ngOnInit(): void {
        this._routeSampleSubscription = this.activatedRoute.data.subscribe((data: { sample: SampleItem }) => {
            this.sample = data.sample;
            this.changeDetector.detectChanges();
        });
    }

    public ngAfterViewInit(): void {
        Highcharts.chart('simple-chart', {
            chart:    {
                zoomType: 'xy'
            },
            title:    {
                text: 'Average Monthly Temperature and Rainfall in Tokyo'
            },
            subtitle: {
                text: 'Source: WorldClimate.com'
            },
            xAxis:    [ {
                categories: [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ],
                crosshair:  true
            } ],
            yAxis:    [ { // Primary yAxis
                labels: {
                    format: '{value}°C',
                    style:  {
                        color: Highcharts.getOptions().colors[ 1 ]
                    }
                },
                title:  {
                    text:  'Temperature',
                    style: {
                        color: Highcharts.getOptions().colors[ 1 ]
                    }
                }
            }, { // Secondary yAxis
                title:    {
                    text:  'Rainfall',
                    style: {
                        color: Highcharts.getOptions().colors[ 0 ]
                    }
                },
                labels:   {
                    format: '{value} mm',
                    style:  {
                        color: Highcharts.getOptions().colors[ 0 ]
                    }
                },
                opposite: true
            } ],
            tooltip:  {
                shared: true
            },
            legend:   {
                layout:          'vertical',
                align:           'left',
                x:               120,
                verticalAlign:   'top',
                y:               100,
                floating:        true,
                backgroundColor: '#FFFFFF'
            },
            series:   [ {
                name:    'Rainfall',
                type:    'column',
                yAxis:   1,
                data:    [ 49.9, 71.5, 106.4, 129.2, 144.0, 176.0, 135.6, 148.5, 216.4, 194.1, 95.6, 54.4 ]
            }, {
                name:    'Temperature',
                type:    'spline',
                data:    [ 7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2, 26.5, 23.3, 18.3, 13.9, 9.6 ]
            } ]
        });
    }
}

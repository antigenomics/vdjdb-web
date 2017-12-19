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
import { Subscription } from 'rxjs/Subscription';
import { SampleItem } from 'shared/sample/sample-item';

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

    }
}

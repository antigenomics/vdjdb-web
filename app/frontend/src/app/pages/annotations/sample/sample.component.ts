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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SampleService } from 'pages/annotations/sample/sample.service';
import { Subscription } from 'rxjs/Subscription';
import { SampleItem } from 'shared/sample/sample-item';
import { LoggerService } from 'utils/logger/logger.service';

@Component({
    selector:        'sample',
    templateUrl:     './sample.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnnotationsSampleComponent implements OnInit, OnDestroy {
    private _sampleServiceEventsSubscription: Subscription;
    private _routeSampleSubscription: Subscription;

    public sample: SampleItem;

    constructor(private activatedRoute: ActivatedRoute, private sampleService: SampleService,
                private changeDetector: ChangeDetectorRef) {
        this.sample = this.activatedRoute.snapshot.data.sample;
    }

    public intersect(): void {
        this.sampleService.intersect(this.sample);
    }

    public ngOnInit(): void {
        this._routeSampleSubscription = this.activatedRoute.data.subscribe((data: { sample: SampleItem }) => {
            this.sample = data.sample;
            this.changeDetector.detectChanges();
        });
        this._sampleServiceEventsSubscription = this.sampleService.getEvents().subscribe((event) => {
            if (this.sample.name === event.name) {
                this.changeDetector.detectChanges();
            }
        });
    }

    public ngOnDestroy(): void {
        if (this._routeSampleSubscription) {
            this._routeSampleSubscription.unsubscribe();
        }
        if (this._sampleServiceEventsSubscription) {
            this._sampleServiceEventsSubscription.unsubscribe();
        }
    }
}

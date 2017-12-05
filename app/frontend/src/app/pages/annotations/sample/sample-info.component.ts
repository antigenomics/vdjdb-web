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
import { Subscription } from 'rxjs/Subscription';
import { SampleItem } from '../../../shared/sample/sample-item';
import { AnnotationsService } from '../annotations.service';
import { IntersectionTableService, IntersectionTableServiceEvent, IntersectionTableServiceEventType } from './table/intersection-table.service';

@Component({
    selector:        'sample-info',
    templateUrl:     './sample-info.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleInfoComponent implements OnInit, OnDestroy {
    private _routeSampleSubscription: Subscription;

    public sample: SampleItem;

    constructor(private activatedRoute: ActivatedRoute, private changeDetector: ChangeDetectorRef,
                private intersectionTableService: IntersectionTableService) {
        this.sample = this.activatedRoute.snapshot.data.sample;
    }

    public ngOnInit(): void {
        this._routeSampleSubscription = this.activatedRoute.data.subscribe((data: { sample: SampleItem }) => {
            this.sample = data.sample;
            this.changeDetector.detectChanges();
        });
    }

    public intersect(): void {
        this.intersectionTableService.intersect(this.sample);
    }

    public ngOnDestroy(): void {
        if (this._routeSampleSubscription) {
            this._routeSampleSubscription.unsubscribe();
        }
    }
}

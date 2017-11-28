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
import { ActivatedRoute, Params } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { SampleItem } from '../../../shared/sample/sample-item';
import { AnnotationsService, AnnotationsServiceEvents } from '../annotations.service';

@Component({
    selector:        'sample-info',
    templateUrl:     './sample-info.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleInfoComponent implements OnDestroy {
    private _annotationsServiceInitializationSubscription: Subscription;
    private _routeSampleSubscription: Subscription;

    public route: string;
    public sample: SampleItem;

    constructor(private annotationService: AnnotationsService, private activatedRoute: ActivatedRoute,
                private changeDetector: ChangeDetectorRef) {
        this._routeSampleSubscription = this.activatedRoute.params.subscribe(async (params: Params) => {
            /*tslint:disable:no-string-literal*/
            this.route = params['sample'];
            /*tslint:disable:no-string-literal*/
            await this.updateSample();
        });
        if (!this.annotationService.isInitialized()) {
            this._annotationsServiceInitializationSubscription = this.annotationService.getEvents().subscribe(async (event) => {
                if (event === AnnotationsServiceEvents.INITIALIZED) {
                    await this.updateSample();
                    this.changeDetector.detectChanges();
                    this._annotationsServiceInitializationSubscription.unsubscribe();
                    this._annotationsServiceInitializationSubscription = undefined;
                }
            });
        }
    }

    public ngOnDestroy(): void {
        if (this._routeSampleSubscription) {
            this._routeSampleSubscription.unsubscribe();
        }
        if (this._annotationsServiceInitializationSubscription) {
            this._annotationsServiceInitializationSubscription.unsubscribe();
        }
    }

    private async updateSample(): Promise<void> {
        this.sample = await this.annotationService.getSample(this.route);
        this.changeDetector.detectChanges();
    }
}

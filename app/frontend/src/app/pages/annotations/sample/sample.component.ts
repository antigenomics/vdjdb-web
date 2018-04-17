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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SampleRouteResolverComponent } from 'pages/annotations/sample/common/sample-route-resolver.component';
import { SampleService } from 'pages/annotations/sample/sample.service';

@Component({
    selector:        'sample',
    templateUrl:     './sample.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnnotationsSampleComponent extends SampleRouteResolverComponent {

    constructor(sampleService: SampleService, activatedRoute: ActivatedRoute, changeDetector: ChangeDetectorRef) {
        super(activatedRoute.data, activatedRoute.snapshot, changeDetector, sampleService);
    }

    public intersect(): void {
        this.sampleService.intersect(this.sample);
    }

    public isHelperBarVisible(): boolean {
        return !this.sample.table.dirty && !this.sample.isProcessing();
    }

    public isProcessingBarVisible(): boolean {
        return this.sample.isProcessing();
    }

    public isEmptyResultsBarVisible(): boolean {
        return this.sample.table.dirty && this.sample.table.isEmpty() && !this.sample.table.error && !this.sample.isProcessing();
    }

    public isErrorBarVisible(): boolean {
        return this.sample.table.dirty && this.sample.table.error && !this.sample.table.loading;
    }

    public isRouterOutletHidden(): boolean {
        return !this.sample.table.dirty || this.sample.table.isEmpty() || this.sample.isProcessing() || this.sample.table.error;
    }
}

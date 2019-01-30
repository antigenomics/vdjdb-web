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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AnnotationsService } from 'pages/annotations/annotations.service';
import { IMultisampleSummaryAnalysisTabState, MultisampleSummaryService } from 'pages/annotations/multisample/summary/multisample-summary.service';
import { Subscription } from 'rxjs';

@Component({
    selector:        'multisample-summary',
    templateUrl:     './multisample-summary.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MultisampleSummaryComponent implements OnInit, OnDestroy {
    private multisampleSummaryServiceEventsSubscription: Subscription;
    private annotationsServiceEventsSubscription: Subscription;

    constructor(public multisampleSummaryService: MultisampleSummaryService, public annotationsService: AnnotationsService,
                private changeDetector: ChangeDetectorRef) {
    }

    public ngOnInit(): void {
        this.multisampleSummaryServiceEventsSubscription = this.multisampleSummaryService.getEvents().subscribe(() => {
            this.changeDetector.detectChanges();
        });
        this.annotationsServiceEventsSubscription = this.annotationsService.getEvents().subscribe(() => {
            this.multisampleSummaryService.checkTabSelectedSamples(this.annotationsService.getSamples());
            this.changeDetector.detectChanges();
        });
    }

    public isCurrentTabNotInitialized(): boolean {
        return this.multisampleSummaryService.getCurrentTabState() === IMultisampleSummaryAnalysisTabState.NOT_INITIALIZED;
    }

    public isCurrentTabUpdating(): boolean {
        const state = this.multisampleSummaryService.getCurrentTabState();
        return state !== IMultisampleSummaryAnalysisTabState.NOT_INITIALIZED && state !== IMultisampleSummaryAnalysisTabState.COMPLETED;
    }

    public getCurrentTabProcessingLabel(): string {
        const state = this.multisampleSummaryService.getCurrentTabState();
        if (state.includes('parse') || state.includes('annotate')) {
            const [ stateTitle, sampleName ] = state.split(':');
            switch (stateTitle) {
                case 'parse':
                    return `Parsing sample file ${sampleName}`;
                case 'annotate':
                    return `Annotating ${sampleName}`;
                default:
                    return 'Updating';
            }
        }
        return 'Updating';
    }

    public isCurrentTabCompleted(): boolean {
        return this.multisampleSummaryService.getCurrentTabState() === IMultisampleSummaryAnalysisTabState.COMPLETED;
    }

    public isCurrentTabDirty(): boolean {
        return this.multisampleSummaryService.isCurrentTabDirty();
    }

    public ngOnDestroy(): void {
        this.multisampleSummaryServiceEventsSubscription.unsubscribe();
        this.annotationsServiceEventsSubscription.unsubscribe();
    }
}

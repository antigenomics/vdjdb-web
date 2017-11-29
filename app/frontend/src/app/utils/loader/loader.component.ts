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
import { ResolveEnd, ResolveStart, Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';

@Component({
    selector:        'loader',
    templateUrl:     './loader.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent implements OnInit, OnDestroy {
    private static changeDetectorDelay: number = 50;
    private _isLoading: boolean = false;
    private _routeEventsSubscription: Subscription;

    constructor(private router: Router, private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this._routeEventsSubscription = this.router.events.subscribe((event) => {
            if (event instanceof ResolveStart) {
                this._isLoading = true;
            } else if (event instanceof ResolveEnd) {
                this._isLoading = false;
            }
            window.setTimeout(() => {
                this.changeDetector.detectChanges();
            }, LoaderComponent.changeDetectorDelay);

        });
    }

    public isLoading(): boolean {
        return this._isLoading;
    }

    public ngOnDestroy(): void {
        if (this._routeEventsSubscription) {
            this._routeEventsSubscription.unsubscribe();
        }
    }
}

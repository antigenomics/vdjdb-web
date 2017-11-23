/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { FiltersService, FiltersServiceEventType } from '../../../shared/filters/filters.service';

@Component({
    selector:        'search-info',
    templateUrl:     './search-info.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchInfoComponent implements OnDestroy {
    private _currentState: string = 'info';
    private _resetEvent: Subscription;

    constructor(private filters: FiltersService, private changeDetector: ChangeDetectorRef) {
        this._resetEvent = this.filters.getEvents()
                               .subscribe((event: FiltersServiceEventType) => {
                                   if (event === FiltersServiceEventType.RESET) {
                                       this.changeDetector.detectChanges();
                                   }
                               });
    }

    public isCurrentState(state: string): boolean {
        return this._currentState === state;
    }

    public setCurrentState(state: string): void {
        this._currentState = state;
    }

    public ngOnDestroy() {
        this._resetEvent.unsubscribe();
    }
}

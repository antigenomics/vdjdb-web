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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { FiltersService } from '../../common/filters/filters.service';
import { SearchTableService } from '../../common/table/search/search-table.service';

@Component({
    selector:        'search',
    templateUrl:     './search.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchPageComponent implements OnInit, OnDestroy {
    private _updateEventSubscription: Subscription;

    constructor(private table: SearchTableService, private filters: FiltersService, private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        this._updateEventSubscription = this.table.updateEvent.subscribe(() => {
            this.changeDetector.detectChanges();
        });
    }

    public search(): void {
        this.table.update();
    }

    public reset(): void {
        this.filters.setDefault();
    }

    public isLoading(): boolean {
        return this.table.loading || !this.table.dirty;
    }

    public ngOnDestroy(): void {
        this._updateEventSubscription.unsubscribe();
    }
}

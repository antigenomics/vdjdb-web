import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { FiltersService, FiltersServiceEventType } from '../../../common/filters/filters.service';

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
            .filter((event: FiltersServiceEventType) => {
                return event === FiltersServiceEventType.Reset;
            }).subscribe(() => {
            this.changeDetector.detectChanges();
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

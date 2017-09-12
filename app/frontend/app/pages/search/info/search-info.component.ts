import { ChangeDetectionStrategy, Component } from '@angular/core';


@Component({
    selector:        'search-info',
    templateUrl:     './search-info.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchInfoComponent {
    private _currentState: string = 'info';

    isCurrentState(state: string): boolean {
        return this._currentState === state;
    }

    setCurrentState(state: string): void {
        this._currentState = state;
    }
}
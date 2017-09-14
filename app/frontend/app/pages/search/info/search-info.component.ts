import { Component } from '@angular/core';

@Component({
    selector:        'search-info',
    templateUrl:     './search-info.component.html'
})
export class SearchInfoComponent {
    private _currentState: string = 'info';

    public isCurrentState(state: string): boolean {
        return this._currentState === state;
    }

    public setCurrentState(state: string): void {
        this._currentState = state;
    }
}

import { Injectable } from '@angular/core';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/reduce';

export class FiltersGroupSavedState {
    collapsed: boolean = true;
}

@Injectable()
export class FiltersGroupService {
    private savedStates: Map<string, FiltersGroupSavedState> = new Map();

    saveState(id: string, state: FiltersGroupSavedState): void {
        this.savedStates.set(id, state);
    }

    getSavedState(id: string): FiltersGroupSavedState {
        if (this.savedStates.has(id)) {
            return this.savedStates.get(id)
        } else {
            return new FiltersGroupSavedState();
        }
    }
}
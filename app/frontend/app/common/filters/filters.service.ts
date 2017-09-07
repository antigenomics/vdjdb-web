import { Injectable } from '@angular/core';
import { Filter, FilterSavedState } from './filters';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/reduce';

export const enum FilterCommand {
    SetDefault,
    CollectFilters
}

@Injectable()
export class FiltersService {
    private filtersCount: number = 0;
    private commandPool: Subject<FilterCommand> = new Subject();
    private filtersPool: Subject<Filter[]> = new Subject();
    private savedStates: Map<string, FilterSavedState> = new Map();

    registerFilter(id?: string) : any {
        this.filtersCount += 1;
        if (id && this.savedStates.has(id)) {
            return this.savedStates.get(id);
        }
        return undefined;
    }

    releaseFilter(id?: string, state?: any) : void {
        this.filtersCount -= 1;
        if (id) {
            this.savedStates.set(id, state);
        }
    }

    getCommandPool() : Observable<FilterCommand> {
        return this.commandPool;
    }

    getFiltersPool() : Subject<Filter[]> {
        return this.filtersPool;
    }

    setDefault(): void {
        this.commandPool.next(FilterCommand.SetDefault);
    }

    getFilters(callback: (filters: Filter[]) => void, errorCallback?: (message: string) => void, completeCallback?: () => void) : void {
        let observable = this.filtersPool.take(this.filtersCount).reduce((accumulated: Filter[], current: Filter[]) => {
            return accumulated.concat(current);
        });
        observable.subscribe(callback, errorCallback);
        this.commandPool.next(FilterCommand.CollectFilters);
        completeCallback();
    }
}
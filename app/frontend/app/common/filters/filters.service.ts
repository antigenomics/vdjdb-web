import { Injectable } from '@angular/core';
import { Filter, FilterSavedState } from './filters';
import { DatabaseService } from '../../database/database.service';
import { Subject } from 'rxjs/Subject';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/take';
import 'rxjs/add/operator/reduce';


export const enum FilterCommand {
    SetDefault,
    CollectFilters,
    CheckErrors
}

@Injectable()
export class FiltersService {
    private filtersCount: number = 0;
    private commandPool: Subject<FilterCommand> = new Subject();
    private filtersPool: Subject<Filter[]> = new Subject();
    private savedStates: Map<string, FilterSavedState> = new Map();

    constructor(_: DatabaseService) {
        // let subscription = database.getMetadata().subscribe((metadata: DatabaseMetadata) => {
        //     this.setMetadataOptions(metadata);
        // })
    }

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

    getFilters(callback: (filters: Filter[]) => void, errorCallback?: (message: string) => void) : void {
        let observable = this.filtersPool.take(this.filtersCount).reduce((accumulated: Filter[], current: Filter[]) => {
            return accumulated.concat(current);
        });
        let subscription = observable.subscribe(callback, errorCallback, () => {
            subscription.unsubscribe();
        });
        this.commandPool.next(FilterCommand.CollectFilters);
    }

    // setMetadataOptions(_: DatabaseMetadata) : void {
    //     // this.mhc.setMetadataOptions(metadata);
    //     // this.ag.setMetadataOptions(metadata);
    //     // this.meta.setMetadataOptions(metadata);
    // }

    // isValid(): boolean {
    //     // return this.mhc.isValid() && this.ag.isValid() && this.meta.isValid();
    //     return true;
    // }

    // getErrors(): string[] {
    //     return this.mhc.getErrors()
    //                .concat(this.ag.getErrors())
    //                .concat(this.meta.getErrors());
    // }
    //
    // collectFilters(): Filter[] {
    //     return this.mhc.collectFilters()
    //                .concat(this.ag.collectFilters())
    //                .concat(this.meta.collectFilters());
    // }
}
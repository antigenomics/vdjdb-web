import { Injectable } from '@angular/core';
import { Filter } from "./filters";
import { DatabaseService } from "../../database/database.service";
import { Subject } from "rxjs/Subject";
import { ReplaySubject } from "rxjs/ReplaySubject";
import { Observable } from "rxjs/Observable";
import "rxjs/add/operator/take"
import "rxjs/add/operator/reduce"

export const enum FilterCommand {
    SetDefault,
    CollectFilters
}

@Injectable()
export class FiltersService {
    private filtersCount: number = 0;
    private commandPool: Subject<FilterCommand> = new Subject();
    private filtersPool: Subject<Filter[]> = new ReplaySubject(1);

    constructor(_: DatabaseService) {
        // let subscription = database.getMetadata().subscribe((metadata: DatabaseMetadata) => {
        //     this.setMetadataOptions(metadata);
        // })
    }

    registerFilter() : void {
        this.filtersCount += 1;
    }

    releaseFilter() : void {
        this.filtersCount -= 1;
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

    getFilters(callback: (filters: Filter[]) => void) : void {
        let observable = this.filtersPool.take(this.filtersCount).reduce((accumulated: Filter[], current: Filter[]) => {
            return accumulated.concat(current);
        });
        let subscription = observable.subscribe(callback, () => {}, () => {
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
    // getFilters(): Filter[] {
    //     return this.mhc.getFilters()
    //                .concat(this.ag.getFilters())
    //                .concat(this.meta.getFilters());
    // }
}
import { Injectable } from '@angular/core';
import { Filter, FilterInterface } from "./filters";
import { DatabaseService } from "../../database/database.service";
import { DatabaseMetadata } from "../../database/database-metadata";
import { Subject } from "rxjs/Subject";
import { ReplaySubject } from "rxjs/ReplaySubject";
import { Observable } from "rxjs/Observable";

export const enum FilterCommand {
    SetDefault
}

@Injectable()
export class FiltersService {
    private commandPool: Subject<FilterCommand> = new ReplaySubject(1);

    constructor(database: DatabaseService) {
        let subscription = database.getMetadata().subscribe((metadata: DatabaseMetadata) => {
            this.setMetadataOptions(metadata);
        })
    }

    getCommandPool() : Observable<FilterCommand> {
        return this.commandPool;
    }

    setDefault(): void {
        this.commandPool.next(FilterCommand.SetDefault);
    }

    setMetadataOptions(_: DatabaseMetadata) : void {
        // this.mhc.setMetadataOptions(metadata);
        // this.ag.setMetadataOptions(metadata);
        // this.meta.setMetadataOptions(metadata);
    }

    isValid(): boolean {
        // return this.mhc.isValid() && this.ag.isValid() && this.meta.isValid();
        return true;
    }

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
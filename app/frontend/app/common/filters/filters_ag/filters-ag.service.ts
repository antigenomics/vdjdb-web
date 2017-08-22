import { Injectable } from '@angular/core';
import { Filter, FilterInterface } from "../filters";
import { AGEpitopeFilter, AGOriginFilter } from "./filters-ag";
import { DatabaseMetadata } from "../../../database/database-metadata";


@Injectable()
export class FiltersAGService implements FilterInterface {
    origin: AGOriginFilter = new AGOriginFilter();
    epitope: AGEpitopeFilter = new AGEpitopeFilter();

    setDefault(): void {
        this.origin.setDefault();
        this.epitope.setDefault();
    }

    setMetadataOptions(metadata: DatabaseMetadata) {
        this.origin.setMetadataOptions(metadata);
        this.epitope.setMetadataOptions(metadata);
    }

    isValid(): boolean {
        return this.origin.isValid() && this.epitope.isValid();
    }

    getErrors(): string[] {
        return this.origin.getErrors()
                   .concat(this.epitope.getErrors());
    }

    getFilters(): Filter[] {
        return this.origin.getFilters()
                   .concat(this.epitope.getFilters());
    }
}
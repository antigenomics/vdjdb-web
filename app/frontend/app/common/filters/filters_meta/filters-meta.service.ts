import { Injectable } from '@angular/core';
import { Filter, FilterInterface } from "../filters";
import { MetaGeneralFilter, MetaReliabilityFilter } from "./filters-meta";
import { DatabaseMetadata } from "../../../database/database-metadata";


@Injectable()
export class FiltersMetaService implements FilterInterface {
    general: MetaGeneralFilter = new MetaGeneralFilter();
    reliability: MetaReliabilityFilter = new MetaReliabilityFilter();

    setDefault(): void {
        this.general.setDefault();
        this.reliability.setDefault();
    }

    setMetadataOptions(metadata: DatabaseMetadata) {
        this.general.setMetadataOptions(metadata);
        this.reliability.setMetadataOptions(metadata);
    }

    isValid(): boolean {
        return this.general.isValid() && this.reliability.isValid();
    }

    getErrors(): string[] {
        return this.general.getErrors()
                   .concat(this.reliability.getErrors());
    }

    getFilters(): Filter[] {
        return this.general.getFilters()
                   .concat(this.reliability.getFilters());
    }

}
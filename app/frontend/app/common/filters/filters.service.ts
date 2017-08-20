import { Injectable } from '@angular/core';
import { FiltersTCRService } from "./filters_tcr/filters-tcr.service";
import { Filter, FilterInterface } from "./filters";

@Injectable()
export class FiltersService implements FilterInterface {
    constructor(private tcr: FiltersTCRService) {

    }

    setDefault(): void {
        this.tcr.setDefault();
    }

    isValid(): boolean {
        return this.tcr.isValid();
    }

    getErrors(): string[] {
        return this.tcr.getErrors();
    }

    getFilters(): Filter[] {
        return this.tcr.getFilters();
    }
}
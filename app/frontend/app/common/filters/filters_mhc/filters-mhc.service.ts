import { Injectable } from '@angular/core';
import { Filter, FilterInterface } from "../filters";
import { MHCGeneralClassFilter, MHCHaplotypeFilter } from "./filters-mhc";


@Injectable()
export class FiltersMHCService implements FilterInterface {
    general: MHCGeneralClassFilter = new MHCGeneralClassFilter();
    haplotype: MHCHaplotypeFilter = new MHCHaplotypeFilter();

    setDefault(): void {
        this.general.setDefault();
        this.haplotype.setDefault();
    }

    isValid(): boolean {
        return this.general.isValid() && this.haplotype.isValid();
    }

    getErrors(): string[] {
        return this.general.getErrors()
                   .concat(this.haplotype.getErrors());
    }

    getFilters(): Filter[] {
        return this.general.getFilters()
                   .concat(this.haplotype.getFilters());
    }
}
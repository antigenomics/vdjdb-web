import { Injectable } from '@angular/core';
import { FiltersTCRService } from "./filters_tcr/filters-tcr.service";
import { Filter, FilterInterface } from "./filters";
import { FiltersMHCService } from "./filters_mhc/filters-mhc.service";
import { FiltersAGService } from "./filters_ag/filters-ag.service";
import { FiltersMetaService } from "./filters_meta/filters-meta.service";


@Injectable()
export class FiltersService implements FilterInterface {
    private tcr: FiltersTCRService;
    private mhc: FiltersMHCService;
    private ag: FiltersAGService;
    private meta: FiltersMetaService;

    constructor(tcr: FiltersTCRService, mhc: FiltersMHCService, ag: FiltersAGService, meta: FiltersMetaService) {
        this.tcr = tcr;
        this.mhc = mhc;
        this.ag = ag;
        this.meta = meta;
    }

    setDefault(): void {
        this.tcr.setDefault();
        this.mhc.setDefault();
        this.ag.setDefault();
        this.meta.setDefault();
    }

    isValid(): boolean {
        return this.tcr.isValid() && this.mhc.isValid() && this.ag.isValid() && this.meta.isValid();
    }

    getErrors(): string[] {
        return this.tcr.getErrors()
                   .concat(this.mhc.getErrors())
                   .concat(this.ag.getErrors())
                   .concat(this.meta.getErrors());
    }

    getFilters(): Filter[] {
        return this.tcr.getFilters()
                   .concat(this.mhc.getFilters())
                   .concat(this.ag.getFilters())
                   .concat(this.meta.getFilters());
    }
}
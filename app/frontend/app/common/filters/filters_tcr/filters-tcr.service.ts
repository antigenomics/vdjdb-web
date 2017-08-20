import { Injectable } from '@angular/core';
import { TCRGeneralFilter, TCRSegmentFilter } from './filters-tcr';
import { Filter, FilterInterface } from "../filters";


@Injectable()
export class FiltersTCRService implements FilterInterface {
    general: TCRGeneralFilter = new TCRGeneralFilter();
    segment: TCRSegmentFilter = new TCRSegmentFilter();

    setDefault(): void {
        this.general.setDefault();
        this.segment.setDefault();
    }

    isValid(): boolean {
        return this.general.isValid() && this.segment.isValid();
    }

    getErrors(): string[] {
        return this.general.getErrors()
                   .concat(this.segment.getErrors());
    }

    getFilters(): Filter[] {
        return this.general.getFilters()
                   .concat(this.segment.getFilters());
    }

}
import { FilterInterface, Filter, FilterType } from "../filters";


/** ======================================================================== **/

export class TCRGeneralSpeciesFilter implements FilterInterface {
    human: boolean = true;
    monkey: boolean = true;
    mouse: boolean = true;

    setDefault(): void {
        this.human = true;
        this.monkey = true;
        this.mouse = true;
    }

    isValid(): boolean {
        return true;
    }

    getErrors(): string[] {
        return [];
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.human === false) {
            filters.push(new Filter('species', FilterType.Exact, true, 'HomoSapiens'));
        }
        if (this.monkey === false) {
            filters.push(new Filter('species', FilterType.Exact, true, 'MacacaMulatta'));
        }
        if (this.mouse === false) {
            filters.push(new Filter('species', FilterType.Exact, true, 'MusMusculus'));
        }
        return filters;
    }
}

export class TCRGeneralGeneFilter implements FilterInterface {
    tra: boolean = false;
    trb: boolean = true;
    pairedOnly: boolean = false;

    setDefault(): void {
        this.tra = false;
        this.trb = true;
        this.pairedOnly = false;
    }

    isValid(): boolean {
        return true;
    }

    getErrors(): string[] {
        return [];
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.tra === false) {
            filters.push(new Filter('gene', FilterType.Exact, true, 'TRA'));
        }
        if (this.trb === false) {
            filters.push(new Filter('gene', FilterType.Exact, true, 'TRB'));
        }
        if (this.pairedOnly === true) {
            filters.push(new Filter('complex.id', FilterType.Exact, true, '0'));
        }
        return filters;
    }
}

export class TCRGeneralFilter implements FilterInterface {
    species: TCRGeneralSpeciesFilter = new TCRGeneralSpeciesFilter();
    gene: TCRGeneralGeneFilter = new TCRGeneralGeneFilter();

    setDefault(): void {
        this.species.setDefault();
        this.gene.setDefault();
    }

    isValid(): boolean {
        return this.species.isValid() && this.gene.isValid();
    }

    getErrors(): string[] {
        return this.species.getErrors().concat(this.gene.getErrors());
    }

    getFilters(): Filter[] {
        return this.species.getFilters().concat(this.gene.getFilters());
    }
}

/** ======================================================================== **/

export class TCRSegmentFilter implements FilterInterface {
    v: string = '';
    vAutocomplete: string[] = [];

    j: string = '';
    jAutocomplete: string[] = [];

    setDefault(): void {
        this.v = '';
        this.j = '';
    }

    isValid(): boolean {
        return true;
    }

    getErrors(): string[] {
        return [];
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.v.length !== 0) {
            filters.push(new Filter('v.segm', FilterType.SubstringSet, false, this.v));
        }
        if (this.j.length !== 0) {
            filters.push(new Filter('j.segm', FilterType.SubstringSet, false, this.j));
        }
        return filters;
    }

}

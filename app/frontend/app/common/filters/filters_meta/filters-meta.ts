import { FilterInterface, Filter, FilterType } from "../filters";


/** ======================================================================== **/

export class MetaGeneralAssayTypeFilter implements FilterInterface {
    methodSort: boolean = true;
    methodCulture: boolean = true;
    methodOther: boolean = true;

    setDefault(): void {
        this.methodSort = true;
        this.methodCulture = true;
        this.methodOther = true;
    }

    isValid(): boolean {
        return true;
    }

    getErrors(): string[] {
        return [];
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.methodSort === false) {
            filters.push(new Filter('web.method', FilterType.Exact, true, 'sort'));
        }
        if (this.methodCulture === false) {
            filters.push(new Filter('web.method', FilterType.Exact, true, 'culture'));
        }
        if (this.methodOther === false) {
            filters.push(new Filter('web.method', FilterType.Exact, true, 'other'));
        }
        return filters;
    }
}

export class MetaGeneralSequencingFilter implements FilterInterface {
    seqSanger: boolean = true;
    seqAmplicon: boolean = true;
    seqSingleCell: boolean = true;

    setDefault(): void {
        this.seqSanger = true;
        this.seqAmplicon = true;
        this.seqSingleCell = true;
    }

    isValid(): boolean {
        return true;
    }

    getErrors(): string[] {
        return [];
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.seqSanger === false) {
            filters.push(new Filter('web.method.seq', FilterType.Exact, true, 'sanger'));
        }
        if (this.seqAmplicon === false) {
            filters.push(new Filter('web.method.seq', FilterType.Exact, true, 'amplicon'));
        }
        if (this.seqSingleCell === false) {
            filters.push(new Filter('web.method.seq', FilterType.Exact, true, 'singlecell'));
        }
        return filters;
    }
}

export class MetaGeneralFilter implements FilterInterface {
    references: string = '';
    referencesAutocomplete: string[] = [];

    assayType: MetaGeneralAssayTypeFilter = new MetaGeneralAssayTypeFilter();
    sequencing: MetaGeneralSequencingFilter = new MetaGeneralSequencingFilter();

    setDefault(): void {
        this.references = '';
        this.assayType.setDefault();
        this.sequencing.setDefault();
    }

    isValid(): boolean {
        return this.assayType.isValid() && this.sequencing.isValid();
    }

    getErrors(): string[] {
        return this.assayType.getErrors()
                  .concat(this.sequencing.getErrors());
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.references.length > 0) {
            filters.push(new Filter('reference.id', FilterType.ExactSet, false, this.references));
        }
        return filters.concat(this.assayType.getFilters())
                      .concat(this.sequencing.getFilters());
    }

}

/** ======================================================================== **/

export class MetaReliabilityFilter implements FilterInterface {
    minimalConfidenceScore: number = 0;
    nonCanonical: boolean = false;
    unmapped: boolean = false;

    setDefault(): void {
        this.minimalConfidenceScore = 0;
        this.nonCanonical = false;
        this.unmapped = false;
    }

    isValid(): boolean {
        return true;
    }

    getErrors(): string[] {
        return [];
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.minimalConfidenceScore > 0) {
            filters.push(new Filter('vdjdb.score', FilterType.Level, false, this.minimalConfidenceScore.toString()))
        }
        if (this.nonCanonical === false) {
            filters.push(new Filter('web.cdr3fix.nc', FilterType.Exact, true, 'yes'));
        }
        if (this.unmapped === false) {
            filters.push(new Filter('web.cdr3fix.unmp', FilterType.Exact, true, 'yes'));
        }
        return filters;
    }

}

/** ======================================================================== **/
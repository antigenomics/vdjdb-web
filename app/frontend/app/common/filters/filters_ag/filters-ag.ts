import { FilterInterface, Filter, FilterType } from "../filters";
import { isSequencePatternValid } from "../../../utils/pattern.util";


/** ======================================================================== **/

export class AGOriginFilter implements FilterInterface {
    species: string = '';
    speciesAutocomplete: string[] = [];

    genes: string = '';
    genesAutocomplete: string[] = [];

    setDefault(): void {
        this.species = '';
        this.genes = '';
    }

    isValid(): boolean {
        return true;
    }

    getErrors(): string[] {
        return [];
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.species.length > 0) {
            filters.push(new Filter('antigen.species', FilterType.ExactSet, false, this.species));
        }
        if (this.genes.length > 0) {
            filters.push(new Filter('antigen.gene', FilterType.ExactSet, false, this.genes));
        }
        return filters;
    }

}

/** ======================================================================== **/

export class AGEpitopeFilter implements FilterInterface {
    sequence: string = '';
    sequenceAutocomplete: string[] = [];
    sequenceSuggestions: any = {};

    pattern: string = '';
    patternSubstring: boolean = false;

    setDefault(): void {
        this.sequence = '';
        this.pattern = '';
        this.patternSubstring = false;
    }

    isValid(): boolean {
        this.pattern = this.pattern.toUpperCase();
        return isSequencePatternValid(this.pattern);
    }

    getErrors(): string[] {
        return []; //TODO
    }

    getFilters(): Filter[] {
        let filters: Filter[] = [];
        if (this.sequence.length > 0) {
            filters.push(new Filter('antigen.epitope', FilterType.ExactSet, false, this.sequence));
        }
        if (this.pattern.length !== 0) {
            let value = this.pattern;
            if (this.patternSubstring === false) {
                value = '^' + value + '$';
            }
            filters.push(new Filter('antigen.epitope', FilterType.Pattern, false, value.replace(/X/g, ".")));
        }
        return filters;
    }
}
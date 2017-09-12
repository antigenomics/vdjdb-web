import { Filter, FilterInterface, FilterType } from "../filters";
import { isSequencePatternValid } from "../../../utils/pattern.util";


export class AGOriginFilter implements FilterInterface {
    species: string;
    speciesValues: string[] = [];

    genes: string;
    genesValues: string[] = [];

    setDefault(): void {
        this.species = '';
        this.genes = '';
    }

    collectFilters(filters: Filter[], _: string[]): void {
        if (this.species.length > 0) {
            filters.push(new Filter('antigen.species', FilterType.SubstringSet, false, this.species));
        }
        if (this.genes.length > 0) {
            filters.push(new Filter('antigen.gene', FilterType.SubstringSet, false, this.genes));
        }
    }

    getFilterId(): string {
        return 'ag.origin';
    }
}

export class AGEpitopeFilter implements FilterInterface {
    epitopeSequence: string;
    epitopeValues: string[] = [];

    epitopePattern: string;
    epitopePatternSubstring: boolean;
    epitopePatternValid: boolean;

    setDefault(): void {
        this.epitopeSequence = '';
        this.epitopePattern = '';
        this.epitopePatternSubstring = false;
        this.epitopePatternValid = true;
    }

    collectFilters(filters: Filter[], errors: string[]): void {
        if (!this.isPatternValid()) {
            errors.push("Epitope pattern is not valid");
            return;
        }
        if (this.epitopeSequence.length > 0) {
            filters.push(new Filter('antigen.epitope', FilterType.SubstringSet, false, this.epitopeSequence));
        }
        if (this.epitopePattern.length !== 0) {
            let value = this.epitopePattern;
            if (this.epitopePatternSubstring === false) {
                value = '^' + value + '$';
            }
            filters.push(new Filter('antigen.epitope', FilterType.Pattern, false, value.replace(/X/g, ".")));
        }
    }

    getFilterId(): string {
        return 'ag.epitope';
    }

    checkPattern(newValue: string): void {
        this.epitopePattern = newValue.toUpperCase();
        this.epitopePatternValid = isSequencePatternValid(this.epitopePattern);
    }

    isPatternValid(): boolean {
        return this.epitopePatternValid;
    }
}
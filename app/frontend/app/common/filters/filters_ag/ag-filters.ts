import { Filter, FilterInterface, FilterType } from "../filters";
import { SetEntry } from "../common/set/set-entry";
import { Utils } from "../../../utils/utils";


export class AGOriginFilter implements FilterInterface {
    speciesSelected: SetEntry[] = [];
    speciesValues: string[] = [];

    genesSelected: SetEntry[] = [];
    genesValues: string[] = [];

    setDefault(): void {
        Utils.Array.clear(this.speciesSelected);
        Utils.Array.clear(this.genesSelected);
    }

    collectFilters(filters: Filter[], _: string[]): void {
        if (this.speciesSelected.length > 0) {
            filters.push(new Filter('antigen.species', FilterType.SubstringSet, false, SetEntry.toString(this.speciesSelected)));
        }
        if (this.genesSelected.length > 0) {
            filters.push(new Filter('antigen.gene', FilterType.SubstringSet, false, SetEntry.toString(this.genesSelected)));
        }
    }

    getFilterId(): string {
        return 'ag.origin';
    }
}

export class AGEpitopeFilter implements FilterInterface {
    epitopeSelected: SetEntry[] = [];
    epitopeValues: string[] = [];

    epitopePattern: string;
    epitopePatternSubstring: boolean;
    epitopePatternValid: boolean;

    setDefault(): void {
        Utils.Array.clear(this.epitopeSelected);
        this.epitopePattern = '';
        this.epitopePatternSubstring = false;
        this.epitopePatternValid = true;
    }

    collectFilters(filters: Filter[], errors: string[]): void {
        if (!this.isPatternValid()) {
            errors.push("Epitope pattern is not valid");
            return;
        }
        if (this.epitopeSelected.length > 0) {
            filters.push(new Filter('antigen.epitope', FilterType.SubstringSet, false, SetEntry.toString(this.epitopeSelected)));
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
        this.epitopePatternValid = Utils.SequencePattern.isPatternValid(this.epitopePattern);
    }

    isPatternValid(): boolean {
        return this.epitopePatternValid;
    }
}
import { Utils } from '../../../utils/utils';
import { SetEntry } from '../common/set/set-entry';
import { Filter, FilterInterface, FilterType } from '../filters';

export class AGOriginFilter implements FilterInterface {
    public speciesSelected: SetEntry[] = [];
    public speciesValues: string[] = [];

    public genesSelected: SetEntry[] = [];
    public genesValues: string[] = [];

    public setDefault(): void {
        Utils.Array.clear(this.speciesSelected);
        Utils.Array.clear(this.genesSelected);
    }

    public collectFilters(filters: Filter[], _: string[]): void {
        if (this.speciesSelected.length > 0) {
            filters.push(new Filter('antigen.species', FilterType.SubstringSet, false, SetEntry.toString(this.speciesSelected)));
        }
        if (this.genesSelected.length > 0) {
            filters.push(new Filter('antigen.gene', FilterType.SubstringSet, false, SetEntry.toString(this.genesSelected)));
        }
    }

    public getFilterId(): string {
        return 'ag.origin';
    }
}

export class AGEpitopeFilter implements FilterInterface {
    public epitopeSelected: SetEntry[] = [];
    public epitopeValues: string[] = [];

    public epitopePattern: string;
    public epitopePatternSubstring: boolean;
    public epitopePatternValid: boolean;

    public setDefault(): void {
        Utils.Array.clear(this.epitopeSelected);
        this.epitopePattern = '';
        this.epitopePatternSubstring = false;
        this.epitopePatternValid = true;
    }

    public collectFilters(filters: Filter[], errors: string[]): void {
        if (!this.isPatternValid()) {
            errors.push('Epitope pattern is not valid');
            return;
        }
        if (this.epitopeSelected.length > 0) {
            filters.push(new Filter('antigen.epitope', FilterType.SubstringSet, false, SetEntry.toString(this.epitopeSelected)));
        }
        if (this.epitopePattern.length !== 0) {
            let value = this.epitopePattern;
            if (this.epitopePatternSubstring === false) {
                value = `^${value}$`;
            }
            filters.push(new Filter('antigen.epitope', FilterType.Pattern, false, value.replace(/X/g, '.')));
        }
    }

    public getFilterId(): string {
        return 'ag.epitope';
    }

    public checkPattern(newValue: string): void {
        this.epitopePattern = newValue.toUpperCase();
        this.epitopePatternValid = Utils.SequencePattern.isPatternValid(this.epitopePattern);
    }

    public isPatternValid(): boolean {
        return this.epitopePatternValid;
    }
}

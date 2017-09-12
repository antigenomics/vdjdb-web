import { Filter, FilterInterface, FilterType } from "../filters";
import { isSequencePatternValid } from "../../../utils/pattern.util";


export class TCRSegmentsFilter implements FilterInterface {
    vSegment: string;
    vSegmentValues: string[] = [];

    jSegment: string;
    jSegmentValues: string[] = [];

    setDefault(): void {
        this.vSegment = '';
        this.jSegment = '';
    }

    collectFilters(filters: Filter[], _: string[]): void {
        if (this.vSegment.length !== 0) {
            filters.push(new Filter('v.segm', FilterType.SubstringSet, false, this.vSegment));
        }
        if (this.jSegment.length !== 0) {
            filters.push(new Filter('j.segm', FilterType.SubstringSet, false, this.jSegment));
        }
    }

    getFilterId(): string {
        return 'tcr.segments';
    }
}

export class TCRGeneralFilter implements FilterInterface {
    human: boolean;
    monkey: boolean;
    mouse: boolean;

    tra: boolean;
    trb: boolean;
    pairedOnly: boolean;

    setDefault(): void {
        this.human = true;
        this.monkey = true;
        this.mouse = true;

        this.tra = false;
        this.trb = true;
        this.pairedOnly = false;
    }

    collectFilters(filters: Filter[], _: string[]): void {
        if (this.human === false) {
            filters.push(new Filter('species', FilterType.Exact, true, 'HomoSapiens'));
        }
        if (this.monkey === false) {
            filters.push(new Filter('species', FilterType.Exact, true, 'MacacaMulatta'));
        }
        if (this.mouse === false) {
            filters.push(new Filter('species', FilterType.Exact, true, 'MusMusculus'));
        }
        if (this.tra === false) {
            filters.push(new Filter('gene', FilterType.Exact, true, 'TRA'));
        }
        if (this.trb === false) {
            filters.push(new Filter('gene', FilterType.Exact, true, 'TRB'));
        }
        if (this.pairedOnly === true) {
            filters.push(new Filter('complex.id', FilterType.Exact, true, '0'));
        }
    }

    getFilterId(): string {
        return 'tcr.general';
    }
}

export class TCR_CDR3Filter implements FilterInterface {
    pattern: string;
    patternSubstring: boolean;
    patternValid: boolean;

    setDefault(): void {
        this.pattern = '';
        this.patternSubstring = false;
        this.patternValid = true;
    }

    collectFilters(filters: Filter[], errors: string[]): void {
        if (!this.isPatternValid()) {
            errors.push("CDR3 pattern is not valid");
            return;
        }
        if (this.pattern.length !== 0) {
            let value = this.pattern;
            if (this.patternSubstring === false) {
                value = '^' + value + '$';
            }
            filters.push(new Filter('cdr3', FilterType.Pattern, false, value.replace(/X/g, ".")));
        }
    }

    getFilterId(): string {
        return 'tcr.cdr3';
    }

    checkPattern(newValue: string): void {
        this.pattern = newValue.toUpperCase();
        this.patternValid = isSequencePatternValid(this.pattern);
    }

    isPatternValid(): boolean {
        return this.patternValid;
    }
}
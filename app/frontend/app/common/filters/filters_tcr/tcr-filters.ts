import { Utils } from '../../../utils/utils';
import { SetEntry } from '../common/set/set-entry';
import { SliderRangeModel } from '../common/slider/slider.component';
import { Filter, FilterInterface, FilterType } from '../filters';

export class TCRSegmentsFilter implements FilterInterface {
    public vSegmentSelected: SetEntry[] = [];
    public vSegmentValues: string[] = [];

    public jSegmentSelected: SetEntry[] = [];
    public jSegmentValues: string[] = [];

    public setDefault(): void {
        Utils.Array.clear(this.vSegmentSelected);
        Utils.Array.clear(this.jSegmentSelected);
    }

    public collectFilters(filters: Filter[], _: string[]): void {
        if (this.vSegmentSelected.length !== 0) {
            filters.push(new Filter('v.segm', FilterType.SubstringSet, false, SetEntry.toString(this.vSegmentSelected)));
        }
        if (this.jSegmentSelected.length !== 0) {
            filters.push(new Filter('j.segm', FilterType.SubstringSet, false, SetEntry.toString(this.jSegmentSelected)));
        }
    }

    public getFilterId(): string {
        return 'tcr.segments';
    }
}

export class TCRGeneralFilter implements FilterInterface {
    public human: boolean;
    public monkey: boolean;
    public mouse: boolean;

    public tra: boolean;
    public trb: boolean;
    public pairedOnly: boolean;

    public setDefault(): void {
        this.human = true;
        this.monkey = true;
        this.mouse = true;

        this.tra = false;
        this.trb = true;
        this.pairedOnly = false;
    }

    public collectFilters(filters: Filter[], _: string[]): void {
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

    public getFilterId(): string {
        return 'tcr.general';
    }
}

export class TCRcdr3Filter implements FilterInterface {
    public pattern: string;
    public patternSubstring: boolean;
    public patternValid: boolean;

    public lengthMin: number = 5;
    public lengthMax: number = 30;
    public length: SliderRangeModel;

    public setDefault(): void {
        this.pattern = '';
        this.patternSubstring = false;
        this.patternValid = true;

        this.length = new SliderRangeModel(this.lengthMin, this.lengthMax);
    }

    public collectFilters(filters: Filter[], errors: string[]): void {
        if (!this.isPatternValid()) {
            errors.push('CDR3 pattern is not valid');
            return;
        } else if (this.pattern.length !== 0) {
            let value = this.pattern;
            if (this.patternSubstring === false) {
                value = `^${value}$`;
            }
            filters.push(new Filter('cdr3', FilterType.Pattern, false, value.replace(/X/g, '.')));
        }

        if (this.length.min < this.lengthMin || this.length.max > this.lengthMax) {
            errors.push('Incorrect cdr3 length');
        } else if (this.length.min !== this.lengthMin || this.length.max !== this.lengthMax) {
            filters.push(new Filter('cdr3', FilterType.Range, false, this.length.toString()));
        }
    }

    public getFilterId(): string {
        return 'tcr.cdr3';
    }

    public checkPattern(newValue: string): void {
        this.pattern = newValue.toUpperCase();
        this.patternValid = Utils.SequencePattern.isPatternValid(this.pattern);
    }

    public isPatternValid(): boolean {
        return this.patternValid;
    }
}

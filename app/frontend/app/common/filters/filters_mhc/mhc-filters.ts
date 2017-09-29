import { Utils } from '../../../utils/utils';
import { SetEntry } from '../common/set/set-entry';
import { Filter, FilterInterface, FiltersOptions, FilterType } from '../filters';

export class MHCGeneralFilter implements FilterInterface {
    public mhci: boolean;
    public mhcii: boolean;

    public setDefault(): void {
        this.mhci = true;
        this.mhcii = true;
    }

    public setOptions(_: FiltersOptions): void {
        return;
    }

    public collectFilters(filters: Filter[], _: string[]): void {
        if (this.mhci === false) {
            filters.push(new Filter('mhc.class', FilterType.Exact, true, 'MHCI'));
        }
        if (this.mhcii === false) {
            filters.push(new Filter('mhc.class', FilterType.Exact, true, 'MHCII'));
        }
    }

    public getFilterId(): string {
        return 'general';
    }
}

export class MHCHaplotypeFilter implements FilterInterface {
    public firstChainSelected: SetEntry[] = [];
    public firstChainValues: string[] = [];

    public secondChainSelected: SetEntry[] = [];
    public secondChainValues: string[] = [];

    public setDefault(): void {
        this.firstChainSelected = [];
        this.secondChainSelected = [];
    }

    public setOptions(options: FiltersOptions): void {
        if (options.hasOwnProperty('firstChainValues')) {
            this.firstChainValues = options.firstChainValues;
        }
        if (options.hasOwnProperty('secondChainValues')) {
            this.secondChainValues = options.secondChainValues;
        }
    }

    public collectFilters(filters: Filter[], _: string[]): void {
        if (this.firstChainSelected.length > 0) {
            filters.push(new Filter('mhc.a', FilterType.SubstringSet, false, SetEntry.toString(this.firstChainSelected)));
        }
        if (this.secondChainSelected.length > 0) {
            filters.push(new Filter('mhc.b', FilterType.SubstringSet, false, SetEntry.toString(this.secondChainSelected)));
        }
    }

    public getFilterId(): string {
        return 'haplotype';
    }
}

import { Utils } from '../../../utils/utils';
import { SetEntry } from '../common/set/set-entry';
import { Filter, FilterInterface, FilterType } from '../filters';

export class MHCGeneralFilter implements FilterInterface {
    public mhci: boolean;
    public mhcii: boolean;

    public setDefault(): void {
        this.mhci = true;
        this.mhcii = true;
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
        return 'mhc.general';
    }
}

export class MHCHaplotypeFilter implements FilterInterface {
    public firstChainSelected: SetEntry[] = [];
    public firstChainValues: string[] = [];

    public secondChainSelected: SetEntry[] = [];
    public secondChainValues: string[] = [];

    public setDefault(): void {
        Utils.Array.clear(this.firstChainSelected);
        Utils.Array.clear(this.secondChainSelected);
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
        return 'mhc.haplotype';
    }
}

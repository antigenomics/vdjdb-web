import { Filter, FilterInterface, FilterType } from "../filters";
import { SetEntry } from "../common/set/set-entry";
import { Utils } from "../../../utils/utils";


export class MHCGeneralFilter implements FilterInterface {
    mhci: boolean;
    mhcii: boolean;

    setDefault(): void {
        this.mhci = true;
        this.mhcii = true;
    }

    collectFilters(filters: Filter[], _: string[]): void {
        if (this.mhci === false) {
            filters.push(new Filter('mhc.class', FilterType.Exact, true, 'MHCI'));
        }
        if (this.mhcii === false) {
            filters.push(new Filter('mhc.class', FilterType.Exact, true, 'MHCII'));
        }
    }

    getFilterId(): string {
        return 'mhc.general';
    }
}

export class MHCHaplotypeFilter implements FilterInterface {
    firstChainSelected: SetEntry[] = [];
    firstChainValues: string[] = [];

    secondChainSelected: SetEntry[] = [];
    secondChainValues: string[] = [];

    setDefault(): void {
        Utils.Array.clear(this.firstChainSelected);
        Utils.Array.clear(this.secondChainSelected);
    }

    collectFilters(filters: Filter[], _: string[]): void {
        if (this.firstChainSelected.length > 0) {
            filters.push(new Filter('mhc.a', FilterType.SubstringSet, false, SetEntry.toString(this.firstChainSelected)));
        }
        if (this.secondChainSelected.length > 0) {
            filters.push(new Filter('mhc.b', FilterType.SubstringSet, false, SetEntry.toString(this.secondChainSelected)));
        }
    }

    getFilterId(): string {
        return 'mhc.haplotype';
    }
}
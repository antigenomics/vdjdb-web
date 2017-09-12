import { Filter, FilterInterface, FilterType } from "../filters";


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
    firstChain: string;
    firstChainValues: string[] = [];

    secondChain: string;
    secondChainValues: string[] = [];

    setDefault(): void {
        this.firstChain = '';
        this.secondChain = '';
    }

    collectFilters(filters: Filter[], _: string[]): void {
        if (this.firstChain.length > 0) {
            filters.push(new Filter('mhc.a', FilterType.SubstringSet, false, this.firstChain));
        }
        if (this.secondChain.length > 0) {
            filters.push(new Filter('mhc.b', FilterType.SubstringSet, false, this.secondChain));
        }
    }

    getFilterId(): string {
        return 'mhc.haplotype';
    }
}
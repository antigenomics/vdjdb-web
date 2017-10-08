import { SetEntry } from '../common/set/set-entry';
import { Filter, FilterInterface, FilterType, IFiltersOptions } from '../filters';

export class MHCGeneralFilter implements FilterInterface {
    public mhci: boolean;
    public mhcii: boolean;

    public setDefault(): void {
        this.mhci = true;
        this.mhcii = true;
    }

    public setOptions(_: IFiltersOptions): void {
        return;
    }

    public collectFilters(filters: Filter[], _: string[]): void {
        if (this.mhci === false) {
            filters.push(new Filter('mhc.class', FilterType.EXACT, true, 'MHCI'));
        }
        if (this.mhcii === false) {
            filters.push(new Filter('mhc.class', FilterType.EXACT, true, 'MHCII'));
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

    public setOptions(options: IFiltersOptions): void {
        /* Disable tslint to prevent ClosureCompiler mangling */
        /* tslint:disable:no-string-literal */
        if (options.hasOwnProperty('firstChainValues')) {
            this.firstChainValues = options['firstChainValues'];
        }
        if (options.hasOwnProperty('secondChainValues')) {
            this.secondChainValues = options['secondChainValues'];
        }
        /* tslint:enable:no-string-literal */
    }

    public collectFilters(filters: Filter[], _: string[]): void {
        if (this.firstChainSelected.length > 0) {
            filters.push(new Filter('mhc.a', FilterType.SUBSTRING_SET, false, SetEntry.toString(this.firstChainSelected)));
        }
        if (this.secondChainSelected.length > 0) {
            filters.push(new Filter('mhc.b', FilterType.SUBSTRING_SET, false, SetEntry.toString(this.secondChainSelected)));
        }
    }

    public getFilterId(): string {
        return 'haplotype';
    }
}

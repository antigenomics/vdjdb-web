import { EventEmitter, Injectable } from '@angular/core';
import { Filter, FilterInterface, IFiltersOptions } from './filters';
import { AGFiltersService } from './filters_ag/ag-filters.service';
import { MetaFiltersService } from './filters_meta/meta-filters.service';
import { MHCFiltersService } from './filters_mhc/mhc-filters.service';
import { TCRFiltersService } from './filters_tcr/tcr-filters.service';

export type FiltersServiceEventType = number;

export namespace FiltersServiceEventType {
    export const META: number = 0;
    export const RESET: number = 1;
    export const GET: number = 2;
}

@Injectable()
export class FiltersService implements FilterInterface {
    private _filtersEvents: EventEmitter<FiltersServiceEventType> = new EventEmitter();

    constructor(private tcr: TCRFiltersService, private ag: AGFiltersService,
                private mhc: MHCFiltersService, private meta: MetaFiltersService) {
        this.setDefault();
    }

    public getEvents(): EventEmitter<FiltersServiceEventType> {
        return this._filtersEvents;
    }

    public setDefault(): void {
        this.tcr.setDefault();
        this.ag.setDefault();
        this.mhc.setDefault();
        this.meta.setDefault();
        this._filtersEvents.emit(FiltersServiceEventType.RESET);
    }

    public setOptions(options: IFiltersOptions): void {
        const tcrFilterId = this.tcr.getFilterId();
        if (options.hasOwnProperty(tcrFilterId)) {
            this.tcr.setOptions(options[tcrFilterId]);
        }

        const agFilterId = this.ag.getFilterId();
        if (options.hasOwnProperty(agFilterId)) {
            this.ag.setOptions(options[agFilterId]);
        }

        const mhcFilterId = this.mhc.getFilterId();
        if (options.hasOwnProperty(mhcFilterId)) {
            this.mhc.setOptions(options[mhcFilterId]);
        }

        const metaFilterId = this.meta.getFilterId();
        if (options.hasOwnProperty(metaFilterId)) {
            this.meta.setOptions(options[metaFilterId]);
        }
        this._filtersEvents.emit(FiltersServiceEventType.META);
    }

    public collectFilters(filters: Filter[], errors: string[]) {
        this.tcr.collectFilters(filters, errors);
        this.ag.collectFilters(filters, errors);
        this.mhc.collectFilters(filters, errors);
        this.meta.collectFilters(filters, errors);
        this._filtersEvents.emit(FiltersServiceEventType.GET);
    }

    public getFilterId(): string {
        return 'main';
    }
}

import { Injectable } from '@angular/core';
import 'rxjs/add/operator/take';
import { DatabaseMetadata } from '../../database/database-metadata';
import { DatabaseService } from '../../database/database.service';
import { Filter } from './filters';
import { AGFiltersService } from './filters_ag/ag-filters.service';
import { MetaFiltersService } from './filters_meta/meta-filters.service';
import { MHCFiltersService } from './filters_mhc/mhc-filters.service';
import { TCRFiltersService } from './filters_tcr/tcr-filters.service';

@Injectable()
export class FiltersService {
    constructor(private tcr: TCRFiltersService, private ag: AGFiltersService,
                private mhc: MHCFiltersService, private meta: MetaFiltersService,
                private database: DatabaseService) {
        this.database.getMetadata().take(1).subscribe({
            next: (metadata: DatabaseMetadata) => {
                this.tcr.segments.vSegmentValues = metadata.getColumnInfo('v.segm').values;
                this.tcr.segments.jSegmentValues = metadata.getColumnInfo('j.segm').values;

                this.ag.origin.speciesValues = metadata.getColumnInfo('antigen.species').values;
                this.ag.origin.genesValues = metadata.getColumnInfo('antigen.gene').values;
                this.ag.epitope.epitopeValues = metadata.getColumnInfo('antigen.epitope').values;

                this.mhc.haplotype.firstChainValues = metadata.getColumnInfo('mhc.a').values;
                this.mhc.haplotype.secondChainValues = metadata.getColumnInfo('mhc.b').values;

                this.meta.general.referencesValues = metadata.getColumnInfo('reference.id').values;
            }
        });
    }

    public setDefault(): void {
        this.tcr.setDefault();
        this.ag.setDefault();
        this.mhc.setDefault();
        this.meta.setDefault();
    }

    public getFilters(filters: Filter[], errors: string[]) {
        this.tcr.collectFilters(filters, errors);
        this.ag.collectFilters(filters, errors);
        this.mhc.collectFilters(filters, errors);
        this.meta.collectFilters(filters, errors);
    }
}

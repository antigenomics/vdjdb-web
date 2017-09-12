import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TCRFiltersService } from "../tcr-filters.service";


@Component({
    selector:        'tcr-segments-filter',
    templateUrl:     './tcr-segments-filter.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TCRSegmentsFilterComponent {
    constructor(public tcr: TCRFiltersService) {
        // database.getMetadata().take(1).subscribe({
        //     next: (metadata: DatabaseMetadata) => {
        //         this.filters.segments.vSegmentValues = metadata.getColumnInfo('v.segm').values;
        //         this.jSegmentValues = metadata.getColumnInfo('j.segm').values;
        //     }
        // });
    }
}
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FiltersService } from '../../common/filters/filters.service';
import { SearchTableService } from '../../common/table/search/search-table.service';

@Component({
    selector:        'search',
    templateUrl:     './search.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchPageComponent {
    constructor(private table: SearchTableService, private filters: FiltersService) {}

    public search(): void {
        this.table.update();
    }

    public reset(): void {
        this.filters.setDefault();
    }

    public isLoading(): boolean {
        return this.table.loading || !this.table.dirty;
    }
}

import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { SearchTableService } from "pages/search/table/search/search-table.service";
import { SearchInfoService } from "pages/search/info/search-info.service";
import { DiseasesService } from "shared/filters/diseases.service";

@Component({
    selector: 'common-diseases',
    template: ''
})
export class CommonDiseasesActionComponent implements OnInit {

    constructor(private readonly router: Router, private readonly search: SearchTableService,
        private readonly info: SearchInfoService, private readonly diseases: DiseasesService) {
    }

    public ngOnInit(): void {
        this.diseases.isPendingDisease = true;
        this.router.navigateByUrl('/search')
        this.search.waitInitialization().then(() => {
            this.info.state.next('filter.ag');
            this.diseases.isPendingDisease = false;
        })
    }

}
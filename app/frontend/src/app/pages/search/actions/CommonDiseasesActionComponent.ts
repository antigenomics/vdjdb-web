import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { SearchTableService } from "pages/search/table/search/search-table.service";
import { SearchInfoService } from "pages/search/info/search-info.service";

@Component({
    selector: 'common-diseases',
    template: ''
})
export class CommonDiseasesActionComponent implements OnInit {

    constructor(private readonly router: Router, private readonly search: SearchTableService,
        private readonly info: SearchInfoService) {
    }

    public ngOnInit(): void {
        this.router.navigateByUrl('/search')
        this.search.waitInitialization().then(() => {
            this.info.state.next('filter.ag');
        })
    }

}
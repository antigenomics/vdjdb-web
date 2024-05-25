import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { SearchTableService } from "pages/search/table/search/search-table.service";
import { CommonDiseaseType, DiseasesService } from "shared/filters/diseases.service";
import { SearchInfoService } from "pages/search/info/search-info.service";

@Component({
    selector: 'self-antigen',
    template: ''
})
export class SelfAntigenActionComponent implements OnInit {

    constructor(private readonly router: Router, private readonly search: SearchTableService,
                private readonly info: SearchInfoService, private readonly diseases: DiseasesService) {
    }

    public ngOnInit(): void {
        this.router.navigateByUrl('/search')
        this.search.waitInitialization().then(() => {
            this.diseases.selectDisease(CommonDiseaseType.SELFANTIGEN);
            this.info.state.next('filter.ag');
        })
    }

}
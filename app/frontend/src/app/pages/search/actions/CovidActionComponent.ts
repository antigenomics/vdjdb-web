import {Component, OnInit} from "@angular/core";
import {Router} from "@angular/router";
import {SearchTableService} from "pages/search/table/search/search-table.service";
import {CommonInfectionType, InfectionsService} from "shared/filters/infections.service";
import {SearchInfoService} from "pages/search/info/search-info.service";

@Component({
    selector: 'covid19',
    template: ''
})
export class Covid19ActionComponent implements OnInit {

    constructor(private readonly router: Router, private readonly search: SearchTableService,
                private readonly info: SearchInfoService, readonly infections: InfectionsService) {
    }

    public ngOnInit(): void {
        this.router.navigateByUrl('/search')
        this.search.waitInitialization().then(() => {
            this.infections.selectInfection(CommonInfectionType.SARSCOV);
            this.info.state.next('filter.ag');
        })
    }

}
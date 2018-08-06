import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Utils } from 'utils/utils';

export interface BuildInfo {
    name: string;
    version: string;
    builtAt: string;
    commitHash: string;
}

@Component({
    selector: 'build-info',
    templateUrl: './build-info.component.html',
    styleUrls: [ './build-info.component.css' ]
})
export class BuildInfoComponent implements OnInit {
    private static readonly buildInfoURL: string = '/buildInfo';

    public loading: boolean = true;
    public info?: BuildInfo;

    constructor(private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        Utils.HTTP.get(BuildInfoComponent.buildInfoURL).then(({ response }) => {
            this.info = JSON.parse(response) as BuildInfo;
            this.loading = false;
            this.changeDetector.detectChanges();
        });
    }
}
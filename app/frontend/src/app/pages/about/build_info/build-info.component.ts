/*
 *     Copyright 2017-2019 Bagaev Dmitry
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Utils } from 'utils/utils';

export interface IBuildInfo {
    name: string;
    version: string;
    builtAt: string;
    commitHash: string;
}

@Component({
    selector:        'build-info',
    templateUrl:     './build-info.component.html',
    styleUrls:       [ './build-info.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class BuildInfoComponent implements OnInit {
    private static readonly buildInfoURL: string = '/buildInfo';

    public loading: boolean = true;
    public info?: IBuildInfo;

    constructor(private changeDetector: ChangeDetectorRef) {}

    public ngOnInit(): void {
        Utils.HTTP.get(BuildInfoComponent.buildInfoURL).then(({ response }) => {
            this.info = JSON.parse(response) as IBuildInfo;
            this.loading = false;
            this.changeDetector.detectChanges();
        });
    }
}

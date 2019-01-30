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

import { Directive, HostListener, Input } from '@angular/core';
import { Router } from '@angular/router';
import { AnalyticsService } from 'utils/analytics/analytics.service';
import { Utils } from 'utils/utils';

@Directive({
    selector: '[route]'
})
export class RouteDirective {
    @Input('route')
    public routeURL: string;

    @Input('external')
    public external: boolean = false;

    constructor(private router: Router, private analytics: AnalyticsService) {}

    @HostListener('click')
    public onRouteChange(): void {
        this.analytics.hit(this.routeURL);
        if (this.external) {
            document.location.href = this.routeURL;
        } else {
            this.router.navigate([ this.routeURL ]).then(() =>  Utils.Window.scroll(document.body));
        }
    }
}

/*
 *    Copyright 2017 Bagaev Dmitry
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

import { ChangeDetectionStrategy, Component } from '@angular/core';

export class Contributors {
    public title: string;
    public names: string[];
}

@Component({
    selector:        'about',
    templateUrl:     './about.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPageComponent {
    public contributors: Contributors[] = [
        {
            title: 'Utrecht Universty',
            names: [ 'Renske Vroomans', 'Ewald Van Dyk', 'Can Kesmir' ]
        },
        {
            title: 'Cardiff University',
            names: [ 'Garry Dolton', 'Meriem Attaf', 'Cristina Rius', 'Kristin Ladell', 'James E. McLaren', 'Katherine K. Matthews',
                'Andrew K. Sewell', 'David A. Price' ]
        },
        {
            title: 'NIAID & NIH',
            names: [ 'Daniel C. Douek' ]
        },
        {
            title: 'University of New South Wales',
            names: [ 'Fabio Luciani' ]
        },
        {
            title: 'National Institute for Public Health and the Environment, Netherlands',
            names: [ 'Debbie van Baarle' ]
        },
        {
            title: 'Netherlands Cancer Institute',
            names: [ 'Ton Schumacher' ]
        },
        {
            title: 'University of Melbourne',
            names: [ 'Bridie Clemens', 'Katherine Kedzierska' ]
        },
        {
            title: 'St. Jude Children\'s Research Hospital',
            names: [ 'Jeremy C. Crawford', 'Pradyot Dash', 'Paul G. Thomas' ]
        }
    ];

    public joinNames(names: string[]): string {
        return names.join(', ');
    }
}

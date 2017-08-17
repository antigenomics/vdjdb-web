import { Component, ChangeDetectionStrategy } from '@angular/core';

export class Contributors {
    title: string;
    names: string[];
}

@Component({
    templateUrl: './about.component.html',
    styleUrls:   [ './about.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutPageComponent {
    contributors: Contributors[] = [
        {
            title: 'Utrecht Universty',
            names: [ 'Renske Vroomans', 'Ewald Van Dyk', 'Can Kesmir' ]
        },
        {
            title: 'Cardiff University',
            names: [ 'Garry Dolton', 'Meriem Attaf', 'Cristina Rius', 'Kristin Ladell', 'James E. McLaren', 'Katherine K. Matthews', 'Andrew K. Sewell', 'David A. Price' ]
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
}
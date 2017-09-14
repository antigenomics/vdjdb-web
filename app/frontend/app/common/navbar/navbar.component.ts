import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Router } from '@angular/router';
import { Utils } from "../../utils/utils";

@Component({
    selector:    'navbar',
    templateUrl: './navbar.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationBarComponent {
    constructor(private router: Router) {
    }

    route(url: string): void {
        // noinspection JSIgnoredPromiseFromCall
        this.router.navigate([ url ]).then(() =>  Utils.Window.scroll(document.body));
    }
}
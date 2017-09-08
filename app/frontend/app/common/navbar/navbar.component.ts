import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { Utils } from "../../utils/scroll.util";

@Component({
    selector:    'navbar',
    templateUrl: './navbar.component.html'
})
export class NavigationBarComponent {
    constructor(private router: Router) {
    }

    route(url: string): void {
        // noinspection JSIgnoredPromiseFromCall
        this.router.navigate([ url ]).then(() =>  Utils.scroll(document.body));
    }
}
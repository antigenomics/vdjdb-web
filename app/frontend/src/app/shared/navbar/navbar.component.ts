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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { FiltersService } from 'shared/filters/filters.service';
import { LoggerService } from 'utils/logger/logger.service';
import { Utils } from 'utils/utils';

@Component({
  selector:        'navbar',
  templateUrl:     './navbar.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavigationBarComponent implements OnInit, OnDestroy {
  private readonly _isLogged: boolean = false;
  private readonly _userEmail: string = '';
  private readonly _userLogin: string = '';

  // Auto-hide header: slides up when scrolling down, reappears when scrolling
  // up or when the pointer approaches the top edge of the viewport.
  public hidden: boolean = false;

  // Active-tab highlight: the current router URL (without query string), updated on navigation.
  public currentUrl: string = '/';
  private routerSubscription!: Subscription;

  // The dropdowns open on hover (design-system.css), so after a click the pointer is still inside the
  // menu and it would stay open over the page it just navigated to. Holds the id of the dropdown to
  // force closed; cleared on mouseleave so it opens again the next time the pointer arrives. One field
  // is enough because only one dropdown can be under the pointer at a time.
  public dismissedDropdown: string = null;

  private static readonly topRevealZone: number = 60;
  private static readonly scrollHideThreshold: number = 120;
  private static readonly scrollDelta: number = 6;
  private lastScrollY: number = 0;

  // Bound handlers registered OUTSIDE Angular (see ngOnInit) so scroll/mousemove don't trigger a
  // change-detection pass on every event; we re-enter the zone only when visibility flips.
  // Only the window/body scroll drives auto-hide — inner panel scrolls (Motif/Structure side and
  // result columns) must NOT move the bar. Motif/Structure are fixed-height pages that don't
  // body-scroll, so the header simply stays put there; it only hides on tall pages (Browse).
  private readonly scrollHandler = (): void => {
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    let next = this.hidden;
    if (y < NavigationBarComponent.scrollHideThreshold) {
      next = false;
    } else if (y > this.lastScrollY + NavigationBarComponent.scrollDelta) {
      next = true;
    } else if (y < this.lastScrollY - NavigationBarComponent.scrollDelta) {
      next = false;
    }
    this.lastScrollY = y;
    this.setHidden(next);
  }

  private readonly mouseMoveHandler = (event: MouseEvent): void => {
    if (event.clientY <= NavigationBarComponent.topRevealZone) {
      this.setHidden(false);
    }
  }

  private setHidden(value: boolean): void {
    if (this.hidden !== value) {
      this.ngZone.run(() => {
        this.hidden = value;
        this.changeDetector.markForCheck();
      });
    }
  }

  public ngOnInit(): void {
    this.ngZone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
      window.addEventListener('mousemove', this.mouseMoveHandler, { passive: true });
    });

    this.currentUrl = this.stripQuery(this.router.url);
    this.routerSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl = this.stripQuery(event.urlAfterRedirects || event.url);
        this.changeDetector.markForCheck();
      });
  }

  public ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler);
    window.removeEventListener('mousemove', this.mouseMoveHandler);
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  private stripQuery(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  // Highlight the menu item whose route matches the current page. The self-antigen / COVID-19
  // shortcuts redirect to /search, so Browse lights up on those pages (as expected).
  public isActive(route: string): boolean {
    if (route === '/') {
      return this.currentUrl === '/';
    }
    return this.currentUrl === route || this.currentUrl.startsWith(route + '/');
  }

  constructor(logger: LoggerService, private changeDetector: ChangeDetectorRef, private ngZone: NgZone,
              private router: Router, private filters: FiltersService) {
    this._isLogged = Utils.Cookies.getCookie('logged') === 'true';
    this._userEmail = Utils.Cookies.getCookie('email');
    this._userLogin = Utils.Cookies.getCookie('login');
    if (this._userEmail !== undefined && this._userLogin !== undefined) {
      logger.debug('User email', this._userEmail);
      logger.debug('User login', this._userLogin);
    }
  }

  public isLogged(): boolean {
    return this._isLogged;
  }

  public getUserEmail(): string {
    return this._userEmail;
  }

  public getUserLogin(): string {
    return this._userLogin;
  }

  public redirectOnUrl(url: string) {
    document.location.href = url;
  }

  // "All data" means "the unfiltered database", so it clears the filters the user had set. Navigating
  // is not enough on its own: on /search the route is unchanged, so the page component is not
  // recreated and the ngOnInit that would have reset the filters never runs again.
  // forceUpdate() has to follow, and has to be in the .then(): setDefault() only emits RESET, which
  // nothing listens to, whereas the search table re-queries on UPDATE. Firing it before navigation
  // settles would search with the filters of the page being left.
  public browseAllData(): void {
    this.filters.setDefault();
    this.router.navigate([ '/search' ]).then(() => this.filters.forceUpdate());
  }

  public dismissDropdown(id: string): void {
    this.dismissedDropdown = id;
  }

  // Clicks inside a menu must not reach the dropdown host: the host carries its own `route`, and a
  // bubbled click would run that navigation after the item's own — the host's target would win, so
  // "Links" would land on the About page.
  public dismissDropdownFromMenu(event: MouseEvent, id: string): void {
    event.stopPropagation();
    this.dismissedDropdown = id;
  }
}

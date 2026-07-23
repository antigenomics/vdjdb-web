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

  // Scrolling has to close an open dropdown, and nothing else does it. The menus open on CSS :hover,
  // and the bar is position:fixed - so scrolling never moves the pointer off the item it is resting
  // on, `:hover` stays true, and the menu hangs over the page sliding past underneath it. Not even
  // the auto-hide rescues it: the pointer sitting on the bar is inside the top reveal zone, so
  // `mouseMoveHandler` has already pinned the bar visible.
  //
  // Cleared on the next pointer move rather than after a delay: moving the pointer is the user
  // asking for the menu again, and until they do, leaving it shut is what they asked for by scrolling.
  public scrollDismissed: boolean = false;

  /** Mirrors `hidden` onto `body` for anything anchored to the top of the window that is not inside
    * this component - today the annotations sidebar (`semantic-extensions.css`). */
  private static readonly hiddenBodyClass: string = 'navbar-hidden';
  private static readonly topRevealZone: number = 60;
  private static readonly scrollHideThreshold: number = 120;
  private static readonly scrollDelta: number = 6;
  private lastScrollY: number = 0;
  // -1 so the first real mousemove always counts as movement.
  private lastPointerX: number = -1;
  private lastPointerY: number = -1;

  // Bound handlers registered OUTSIDE Angular (see ngOnInit) so scroll/mousemove don't trigger a
  // change-detection pass on every event; we re-enter the zone only when visibility flips.
  // Only the window/body scroll drives auto-hide — inner panel scrolls (Motif/Structure side and
  // result columns) must NOT move the bar. Motif/Structure are fixed-height pages that don't
  // body-scroll, so the header simply stays put there; it only hides on tall pages (Browse).
  private readonly scrollHandler = (): void => {
    const y = window.pageYOffset || document.documentElement.scrollTop || 0;
    if (y !== this.lastScrollY) {
      this.setScrollDismissed(true);
    }
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
    // Only a pointer that actually moved reopens the menus. Browsers dispatch a mousemove after a
    // scroll to re-evaluate :hover under a stationary pointer, and that event carries the coordinates
    // it already had - so clearing on any mousemove at all would undo the dismissal in the same frame
    // the scroll caused it, which is the bug rather than the fix.
    if (event.clientX !== this.lastPointerX || event.clientY !== this.lastPointerY) {
      this.lastPointerX = event.clientX;
      this.lastPointerY = event.clientY;
      this.setScrollDismissed(false);
    }
    if (event.clientY <= NavigationBarComponent.topRevealZone) {
      this.setHidden(false);
    }
  }

  private setHidden(value: boolean): void {
    if (this.hidden !== value) {
      // Published on `body` as well, because the bar is not the only thing anchored to the top of the
      // window: the annotations sidebar sits directly under it and has to travel with it, and there is
      // no component relationship between the two to bind through.
      document.body.classList.toggle(NavigationBarComponent.hiddenBodyClass, value);
      this.ngZone.run(() => {
        this.hidden = value;
        this.changeDetector.markForCheck();
      });
    }
  }

  /** Guarded like `setHidden`, and for the same reason: both handlers run outside Angular on events
    * that fire continuously, so re-entering the zone is worth it only when the value actually flips. */
  private setScrollDismissed(value: boolean): void {
    if (this.scrollDismissed !== value) {
      this.ngZone.run(() => {
        this.scrollDismissed = value;
        if (value) {
          this.blurOpenDropdown();
        }
        this.changeDetector.markForCheck();
      });
    }
  }

  /** A dropdown host keeps focus after it is clicked - it carries `tabindex`, and clicking it
    * navigates without moving focus anywhere else. The CSS opens a menu on `:focus-within` as well as
    * on `:hover`, so from then on that one menu hangs open with the pointer nowhere near it, and
    * `mouseleave` clearing `dismissedDropdown` is what lets it. Marking it dismissed hides it, but the
    * next pointer twitch clears that flag and focus brings it straight back - which is why one menu
    * appeared not to close on scroll while its neighbour did. Dropping focus is what actually closes
    * it. Scoped to the navbar's own dropdown hosts so scrolling never steals focus from a form. */
  private blurOpenDropdown(): void {
    const active = document.activeElement as HTMLElement;
    if (active && typeof active.blur === 'function' &&
        active.classList && active.classList.contains('dropdown') &&
        active.closest('.ui.top.fixed.menu') !== null) {
      active.blur();
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
        this.closeMobileMenu();
        this.changeDetector.markForCheck();
      });
  }

  /** Close the narrow-screen menu after an in-app navigation.
    *
    * The toggle is a CSS `:checked` disclosure with no component state behind it, which is what makes
    * it work without any script - but it also means nothing unchecks it. Tapping "Motif" routes to the
    * motif page and leaves the full-height menu sitting on top of it, so the page the user asked for
    * is hidden behind the menu they used to ask for it, and they have to find the burger again to see
    * it. The `external="true"` links reload the document and reset the checkbox on their own; these
    * are the ones that don't.
    */
  private closeMobileMenu(): void {
    const toggle = document.getElementById('navbar-menu-toggle') as HTMLInputElement;
    if (toggle !== null) {
      toggle.checked = false;
    }
  }

  public ngOnDestroy(): void {
    document.body.classList.remove(NavigationBarComponent.hiddenBodyClass);
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
  // forceUpdate() has to follow it, because setDefault() only emits RESET and nothing listens to
  // RESET — the table re-queries on UPDATE. And it has to be inside the .then(), because the
  // subscriber that turns UPDATE into a search belongs to SearchTable, which the Browse page creates
  // in its constructor and unsubscribes when it is destroyed. Arriving from another page, there is no
  // subscriber until navigation completes, so an earlier emit would be dropped and nothing searched.
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

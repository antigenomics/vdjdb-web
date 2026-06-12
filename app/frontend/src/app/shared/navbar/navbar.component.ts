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
  private static readonly topRevealZone: number = 60;
  private static readonly scrollHideThreshold: number = 120;
  private static readonly scrollDelta: number = 6;
  // Last scroll position tracked per scrolling element. Motif/Structure scroll an
  // inner container (window stays put), so we key by event target instead of a
  // single window offset — otherwise switching between two scroll panes corrupts
  // the up/down direction calc.
  private readonly lastScrollByTarget: WeakMap<EventTarget, number> = new WeakMap();

  // Bound handlers registered OUTSIDE Angular (see ngOnInit) so scroll/mousemove don't trigger a
  // change-detection pass on every event; we re-enter the zone only when visibility flips.
  // Registered in the capture phase so scrolls from inner containers (which don't bubble) are
  // still observed — this is what makes auto-hide work on Motif/Structure, not just Browse.
  private readonly scrollHandler = (event: Event): void => {
    const target = event.target;
    let y: number;
    if (target instanceof HTMLElement && target !== document.documentElement && target !== document.body) {
      y = target.scrollTop;
    } else if (target) {
      y = window.pageYOffset || document.documentElement.scrollTop || 0;
    } else {
      return;
    }
    const last = this.lastScrollByTarget.get(target) || 0;
    let next = this.hidden;
    if (y < NavigationBarComponent.scrollHideThreshold) {
      next = false;
    } else if (y > last + NavigationBarComponent.scrollDelta) {
      next = true;
    } else if (y < last - NavigationBarComponent.scrollDelta) {
      next = false;
    }
    this.lastScrollByTarget.set(target, y);
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
      window.addEventListener('scroll', this.scrollHandler, { passive: true, capture: true });
      window.addEventListener('mousemove', this.mouseMoveHandler, { passive: true });
    });
  }

  public ngOnDestroy(): void {
    window.removeEventListener('scroll', this.scrollHandler, true);
    window.removeEventListener('mousemove', this.mouseMoveHandler);
  }

  constructor(logger: LoggerService, private changeDetector: ChangeDetectorRef, private ngZone: NgZone) {
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
}

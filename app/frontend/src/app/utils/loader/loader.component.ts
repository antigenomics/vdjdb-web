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

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import {
  ActivationEnd, ActivationStart, ChildActivationEnd, ChildActivationStart,
  GuardsCheckEnd, GuardsCheckStart, NavigationEnd, NavigationStart, ResolveEnd,
  ResolveStart, RouteConfigLoadEnd, RouteConfigLoadStart, Router, RoutesRecognized
} from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector:        'loader',
  templateUrl:     './loader.component.html',
  styleUrls:       [ './loader.component.css' ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoaderComponent implements OnInit, OnDestroy {
  private static animationDuration: number = 1000;
  private _previousTimeout: number;
  private _duration: number = LoaderComponent.animationDuration;
  private _isLoading: boolean = false;
  private _visibility: number = 0.0;
  private _progress: number = 0;
  private _routeEventsSubscription: Subscription;

  constructor(private router: Router, private changeDetector: ChangeDetectorRef) {}

  public ngOnInit(): void {
    this._routeEventsSubscription = this.router.events.subscribe((event: any) => {
      if (event instanceof NavigationStart) {
        if (this._previousTimeout !== undefined) {
          window.clearTimeout(this._previousTimeout);
          this._previousTimeout = undefined;
        }
        this._visibility = 1.0;
        this._isLoading = true;
        this._progress = 0;
      } else if (event instanceof RouteConfigLoadStart) {
        this._duration = LoaderComponent.animationDuration;
        this._progress = 50; // tslint:disable-line:no-magic-numbers
      } else if (event instanceof RouteConfigLoadEnd) {
        this._progress = 55; // tslint:disable-line:no-magic-numbers
      } else if (event instanceof RoutesRecognized) {
        this._progress = 60; // tslint:disable-line:no-magic-numbers
      } else if (event instanceof GuardsCheckStart) {
        this._progress = 65; // tslint:disable-line:no-magic-numbers
      } else if (event instanceof ChildActivationStart) {
        this._progress = 70; // tslint:disable-line:no-magic-numbers
      } else if (event instanceof ActivationStart) {
        this._progress = 70; // tslint:disable-line:no-magic-numbers
      } else if (event instanceof GuardsCheckEnd) {
        this._progress = 75; // tslint:disable-line:no-magic-numbers
      } else if (event instanceof ResolveStart) {
        this._progress = 80; // tslint:disable-line:no-magic-numbers
      } else if (event instanceof ResolveEnd) {
        this._progress = 85; // tslint:disable-line:no-magic-numbers
      } else if (event instanceof ActivationEnd) {
        this._progress = 90; // tslint:disable-line:no-magic-numbers
      } else if (event instanceof ChildActivationEnd) {
        this._progress = 90; // tslint:disable-line:no-magic-numbers
      } else if (event instanceof NavigationEnd) {
        this._progress = 100; // tslint:disable-line:no-magic-numbers
        this._duration = 0;
        this._visibility = 0.0;
        this._previousTimeout = window.setTimeout(() => {
          this._isLoading = false;
          this._progress = 0;
          this.changeDetector.detectChanges();
        }, LoaderComponent.animationDuration);
      }
      this.changeDetector.detectChanges();
    });
  }

  public get visibility(): string {
    return `${this._visibility}`;
  }

  public get progress(): string {
    return `${this._progress}%`;
  }

  public get duration(): string {
    return `${this._duration}ms`;
  }

  public isLoading(): boolean {
    return this._isLoading;
  }

  public ngOnDestroy(): void {
    if (this._previousTimeout !== undefined) {
      window.clearTimeout(this._previousTimeout);
    }
    if (this._routeEventsSubscription) {
      this._routeEventsSubscription.unsubscribe();
    }
  }
}

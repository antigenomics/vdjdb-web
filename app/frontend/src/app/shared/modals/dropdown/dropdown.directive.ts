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

import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, Renderer2 } from '@angular/core';

@Directive({
  selector: '[dropdown]'
})
export class DropdownDirective implements AfterViewInit, OnDestroy {
  private _openEventListener: () => void = undefined;
  private _closeEventListener: () => void = undefined;
  private _visible: boolean = false;

  @Input('content')
  public content: any;

  constructor(private renderer2: Renderer2, private elementRef: ElementRef) {}

  public ngAfterViewInit(): void {
    this._openEventListener = this.renderer2.listen(this.elementRef.nativeElement, 'click', () => {
      if (this._visible) {
        this.hide();
      } else {
        this.show();
      }
    });
  }

  public ngOnDestroy(): void {
    this._openEventListener();
  }

  private show(): void {
    this.renderer2.addClass(this.elementRef.nativeElement, 'active');
    this.renderer2.addClass(this.elementRef.nativeElement, 'visible');
    this.renderer2.addClass(this.content, 'visible');
    this.renderer2.setStyle(this.content, 'display', 'block');
    this._visible = true;
    if (!this._closeEventListener) {
      window.setTimeout(() => {
        this._closeEventListener = this.renderer2.listen('document', 'click', () => {
          this.hide();
        });
      });
    }
  }

  private hide(): void {
    this.renderer2.removeClass(this.elementRef.nativeElement, 'active');
    this.renderer2.removeClass(this.elementRef.nativeElement, 'visible');
    this.renderer2.removeClass(this.content, 'visible');
    this.renderer2.removeStyle(this.content, 'display');
    this._visible = false;
    if (this._closeEventListener) {
      this._closeEventListener();
      this._closeEventListener = undefined;
    }
  }
}

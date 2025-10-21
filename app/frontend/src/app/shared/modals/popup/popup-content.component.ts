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

import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, Input } from '@angular/core';
import { DomSanitizer, SafeHtml, SafeResourceUrl } from '@angular/platform-browser';
import { Utils } from 'utils/utils';
import { PopupContentTable } from './popup-content-table';
import WindowViewport = Utils.Window.WindowViewport;

export class PopupBoundingRect {
  public left: string;
  public top: string;
  public bottom: string;
  public width: string;
}

@Component({
  selector:        'popup-content',
  templateUrl:     './popup-content.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PopupContentComponent implements AfterViewInit {
  private static _magicConstant: number = 20.0;
  private _content: string[] | PopupContentTable;
  private _header: string;
  private _footer: string;
  private _width: number;
  private _topShift: number;
  private _bottomShift: number;
  private _htmlContent: SafeHtml | null = null;

  public boundingRect: PopupBoundingRect = new PopupBoundingRect();

  @Input('hostElement')
  public hostElement: HTMLElement;

  @Input('width')
  public set width(width: number) {
    this._width = Number(width); // Workaround if Angular will pass the 'string' argument
  }

  @Input('position')
  public position: 'left' | 'right' | 'top' | 'bottom';

  @Input('display')
  public display: 'paragraph' | 'list' | 'colored-text' | 'image' | 'table' | 'html' = 'paragraph';

  @Input('topShift')
  public set topShift(shift: number) {
    this._topShift = Number(shift);
  }

  @Input('bottomShift')
  public set bottomShift(shift: number) {
    this._bottomShift = Number(shift);
  }

  @Input('shiftStrategy')
  public shiftStrategy: 'absolute' | 'per-item';

  @Input('loading')
  public loading: boolean = false;

  @Input('tableClass')
  public tableClass: string = 'ui very basic fixed single line unstackable compact table';

  @Input('popupClass')
  public popupClass: string = '';

  @Input('popupTableRowClass')
  public popupTableRowClass: string = 'center aligned';

  @Input('content')
  set content(popupContent: string | string[] | PopupContentTable | SafeHtml) {
    this._htmlContent = null;
    if (this.isSafeHtml(popupContent)) {
      this._htmlContent = popupContent as SafeHtml;
      this._content = [];
    } else if (typeof popupContent === 'string' && this.display === 'paragraph') {
      this._content = Utils.Text.splitParagraphs(popupContent);
    } else if (typeof popupContent === 'string') {
      this._content = [ popupContent ];
    } else if (Array.isArray(popupContent)) {
      this._content = popupContent;
    } else if (this.isPopupContentTable(popupContent)) {
      this._content = popupContent;
    } else {
      this._content = [];
    }
  }

  @Input('header')
  set header(headerContent: string) {
    this._header = headerContent;
  }

  @Input('footer')
  set footer(footerContent: string) {
    this._footer = footerContent;
  }

  constructor(public changeDetector: ChangeDetectorRef, private sanitizer: DomSanitizer) {}

  public ngAfterViewInit(): void {
    this.positionElement();
    this.changeDetector.detectChanges();
    this.changeDetector.detach();
  }

  public getPopupContent(): string[] | PopupContentTable {
    if (this._content instanceof PopupContentTable) {
      return this._content;
    } else if (Array.isArray(this._content)) {
      return this._content.length === 0 ? [ 'No content' ] : this._content;
    }
    return this._content;
  }

  public getPopupContentTable(): PopupContentTable {
    return this.getPopupContent() as PopupContentTable;
  }

  public getHeaderContent(): string {
    return this._header;
  }

  public isFooterExists(): boolean {
    return this._footer !== undefined;
  }

  public getFooterContent(): string {
    return this._footer;
  }

  public getImageSrc(): string {
    if (this._content instanceof PopupContentTable) {
      const table = this._content as PopupContentTable;
      if (table.rows.length > 0 && table.rows[0].length > 0) {
        return table.rows[0][0];
      }
    } else if (Array.isArray(this._content) && this._content.length > 0) {
      return (this._content as string[])[0];
    }
    return '';
  }

  public getIframeSrc(): SafeResourceUrl | null {
    let url: string | undefined;
    if (this._content instanceof PopupContentTable) {
      const table = this._content as PopupContentTable;
      if (table.rows.length > 0 && table.rows[0].length > 0) {
        url = table.rows[0][0];
      }
    } else if (Array.isArray(this._content) && this._content.length > 0) {
      url = (this._content as string[])[0];
    }
    if (!url) {
      return null;
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  public positionElement(): void {
    const hostBoundingRectangle = this.hostElement.getBoundingClientRect();
    const windowViewport = Utils.Window.getViewport();

    switch (this.position) {
      case 'left':
        this.positionLeft(hostBoundingRectangle, windowViewport);
        break;
      case 'right':
        this.positionRight(hostBoundingRectangle, windowViewport);
        break;
      case 'top':
        this.positionTop(hostBoundingRectangle, windowViewport);
        break;
      case 'bottom':
        this.positionBottom(hostBoundingRectangle, windowViewport);
        break;
      default:
        break;
    }
    this.boundingRect.width = this._width + 'px';
  }

  private getContentLength(): number {
    if (this._htmlContent) {
      return 1;
    }
    if (this._content === undefined) {
      return 0;
    } else if (this._content instanceof PopupContentTable) {
      return (this._content as PopupContentTable).rows.length;
    } else {
      return (this._content as string[]).length;
    }
  }

  private getTopShift(): number {
    switch (this.shiftStrategy) {
      case 'absolute':
        return this._topShift;
      case 'per-item':
        return this._topShift * this.getContentLength();
      default:
        return this._topShift;
    }
  }

  private getBottomShift(): number {
    switch (this.shiftStrategy) {
      case 'absolute':
        return this._bottomShift;
      case 'per-item':
        return this._bottomShift * this.getContentLength();
      default:
        return this._bottomShift;
    }
  }

  public getHtmlContent(): SafeHtml | null {
    return this._htmlContent;
  }

  private isSafeHtml(candidate: any): candidate is SafeHtml {
    return candidate && typeof candidate === 'object' && 'changingThisBreaksApplicationSecurity' in candidate;
  }

  private isPopupContentTable(candidate: any): candidate is PopupContentTable {
    return candidate instanceof PopupContentTable;
  }

  private positionLeft(hostBoundingRectangle: ClientRect, _: WindowViewport): void {
    let left = hostBoundingRectangle.left - this._width - PopupContentComponent._magicConstant;
    const top = hostBoundingRectangle.top;

    if (left < 0) {
      left = hostBoundingRectangle.left + hostBoundingRectangle.width;
    }

    this.boundingRect.left = left + 'px';
    this.boundingRect.top = `${top + this.getTopShift()}px`;
    this.boundingRect.bottom = 'auto';
  }

  private positionRight(hostBoundingRectangle: ClientRect, windowViewport: WindowViewport): void {
    let left = hostBoundingRectangle.left + hostBoundingRectangle.width;
    const top = hostBoundingRectangle.top;

    if ((left + this._width) > windowViewport.width) {
      left = hostBoundingRectangle.left - this._width;
    }

    this.boundingRect.left = left + 'px';
    this.boundingRect.top = `${top + this.getTopShift()}px`;
    this.boundingRect.bottom = 'auto';
  }

  private positionTop(hostBoundingRectangle: ClientRect, windowViewport: WindowViewport): void {
    let left = hostBoundingRectangle.left - (this._width / 2.0);
    const bottom = windowViewport.height - hostBoundingRectangle.top;

    const rightOverflow = (left + this._width + PopupContentComponent._magicConstant) - windowViewport.width;
    if (rightOverflow > 0) {
      left -= rightOverflow;
    }

    if (left < 0) {
      left = PopupContentComponent._magicConstant;
    }

    this.boundingRect.left = left + 'px';
    this.boundingRect.top = 'auto';
    this.boundingRect.bottom = `${bottom + this.getBottomShift()}px`;
  }

  private positionBottom(hostBoundingRectangle: ClientRect, windowViewport: WindowViewport): void {
    let left = hostBoundingRectangle.left - (this._width / 2.0);
    const top = hostBoundingRectangle.top + hostBoundingRectangle.height;

    const rightOverflow = (left + this._width + PopupContentComponent._magicConstant) - windowViewport.width;
    if (rightOverflow > 0) {
      left -= rightOverflow;
    }

    if (left < 0) {
      left = PopupContentComponent._magicConstant;
    }

    this.boundingRect.left = left + 'px';
    this.boundingRect.top = `${top + this.getTopShift()}px`;
    this.boundingRect.bottom = 'auto';
  }

}

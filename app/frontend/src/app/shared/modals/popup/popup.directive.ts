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

import { ComponentFactoryResolver, ComponentRef, Directive, HostListener, Input, ViewContainerRef } from '@angular/core';
import { PopupContentTable } from './popup-content-table';
import { PopupContentComponent } from './popup-content.component';

@Directive({
    selector: '[popup]'
})
export class PopupDirective {
    private _visible: boolean = false;
    private _tooltip: ComponentRef<PopupContentComponent>;

    @Input('popup')
    public popupContent: string | string[] | PopupContentTable;

    @Input('header')
    public headerContent: string;

    @Input('footer')
    public footerContent: string;

    @Input('width')
    public width: number = 400;

    @Input('position')
    public position: 'left' | 'right' | 'top' | 'bottom' = 'left';

    @Input('display')
    public display: 'paragraph' | 'list' | 'colored-text' | 'table' = 'paragraph';

    @Input('topShift')
    public topShift: number = 0;

    @Input('bottomShift')
    public bottomShift: number = 0;

    @Input('shiftStrategy')
    public shiftStrategy: 'absolute' | 'per-item' = 'absolute';

    @Input('loading')
    public loading: boolean = false;

    @Input('disabled')
    public disabled: boolean = false;

    constructor(private viewContainerRef: ViewContainerRef, private resolver: ComponentFactoryResolver) {}

    public updateView(): void {
        if (this._tooltip && this.disabled) {
            this._tooltip.destroy();
        } else if (this._tooltip && this._tooltip.instance) {
            this._tooltip.instance.hostElement = this.viewContainerRef.element.nativeElement;
            this._tooltip.instance.content = this.popupContent;
            this._tooltip.instance.header = this.headerContent;
            this._tooltip.instance.footer = this.footerContent;
            this._tooltip.instance.width = this.width;
            this._tooltip.instance.position = this.position;
            this._tooltip.instance.display = this.display;
            this._tooltip.instance.topShift = this.topShift;
            this._tooltip.instance.bottomShift = this.bottomShift;
            this._tooltip.instance.shiftStrategy = this.shiftStrategy;
            this._tooltip.instance.loading = this.loading;
            this._tooltip.instance.positionElement();
            this._tooltip.instance.changeDetector.detectChanges();
        }
    }

    @HostListener('focusin')
    @HostListener('mouseenter')
    public show(): void {
        if (!this._visible && !this.disabled) {
            const factory = this.resolver.resolveComponentFactory<PopupContentComponent>(PopupContentComponent);
            this._tooltip = this.viewContainerRef.createComponent<PopupContentComponent>(factory);
            this.updateView();
            this._visible = true;
        }
    }

    @HostListener('focusout')
    @HostListener('mouseleave')
    public hide(): void {
        if (this._visible) {
            if (this._tooltip) {
                this._tooltip.destroy();
            }
            this._visible = false;
        }
    }

}

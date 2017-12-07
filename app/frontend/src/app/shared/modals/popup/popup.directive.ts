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
import { PopupContentComponent } from './popup-content.component';

@Directive({
    selector: '[popup]'
})
export class PopupDirective {
    private _visible: boolean = false;
    private _tooltip: ComponentRef<PopupContentComponent>;

    @Input('popup')
    public popupContent: string;

    @Input('header')
    public headerContent: string;

    @Input('footer')
    public footerContent: string;

    @Input('width')
    public width: number = 400;

    @Input('position')
    public position: 'left' | 'right' | 'top' | 'bottom' = 'left';

    @Input('display')
    public display: 'paragraph' | 'list' = 'paragraph';

    constructor(private viewContainerRef: ViewContainerRef, private resolver: ComponentFactoryResolver) {}

    @HostListener('focusin')
    @HostListener('mouseenter')
    public show(): void {
        if (!this._visible) {
            const factory = this.resolver.resolveComponentFactory<PopupContentComponent>(PopupContentComponent);
            this._tooltip = this.viewContainerRef.createComponent<PopupContentComponent>(factory);
            this._tooltip.instance.hostElement = this.viewContainerRef.element.nativeElement;
            this._tooltip.instance.content = this.popupContent;
            this._tooltip.instance.header = this.headerContent;
            this._tooltip.instance.footer = this.footerContent;
            this._tooltip.instance.width = this.width;
            this._tooltip.instance.position = this.position;
            this._tooltip.instance.display = this.display;
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

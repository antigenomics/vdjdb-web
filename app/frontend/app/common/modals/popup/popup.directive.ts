import { ComponentFactoryResolver, ComponentRef, Directive, HostListener, Input, ViewContainerRef } from '@angular/core';
import { InputConverter, NumberConverter } from '../../../utils/input-converter.decorator';
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

    @Input('width')
    @InputConverter(NumberConverter)
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

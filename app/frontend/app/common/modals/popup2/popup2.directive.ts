import { ComponentFactoryResolver, ComponentRef, Directive, HostListener, Input, ViewContainerRef } from '@angular/core';
import { Popup2ContentComponent } from './popup2-content.component';
import { InputConverter, NumberConverter } from '../../../utils/input-converter.decorator';

@Directive({
    selector: '[popup2]'
})
export class Popup2Directive {
    private _visible: boolean = false;
    private _tooltip: ComponentRef<Popup2ContentComponent>;

    @Input('popup2')
    public popupContent: string;

    @Input('header2')
    public headerContent: string;

    @Input('width')
    @InputConverter(NumberConverter)
    public width: number = 400;

    @Input('position')
    public position: string = 'left';

    constructor(private viewContainerRef: ViewContainerRef, private resolver: ComponentFactoryResolver) {}

    @HostListener('focusin')
    @HostListener('mouseenter')
    public show(): void {
        if (!this._visible) {
            const factory = this.resolver.resolveComponentFactory<Popup2ContentComponent>(Popup2ContentComponent);
            this._tooltip = this.viewContainerRef.createComponent<Popup2ContentComponent>(factory);
            this._tooltip.instance.hostElement = this.viewContainerRef.element.nativeElement;
            this._tooltip.instance.content = this.popupContent;
            this._tooltip.instance.header = this.headerContent;
            this._tooltip.instance.width = this.width;
            this._tooltip.instance.position = this.position;
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

import { ApplicationRef, ComponentFactoryResolver, ComponentRef, Directive, HostListener, Input, ViewContainerRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { PopupContentComponent } from './popup-content.component';

@Directive({
    selector: '[popup]'
})
export class PopupDirective {
    private tooltip: ComponentRef<PopupContentComponent>;
    private visible: boolean;

    @Input('popup')
    public content: string | PopupContentComponent;

    @Input('popupHeader')
    public header: string;

    @Input('popupWidth')
    public popupWidth: '' | 'wide' | 'very wide' = '';

    @Input()
    public tooltipPlacement: 'top' | 'bottom' | 'left' | 'right' = 'left';

    @Input()
    public arrowPosition: string = 'center left';

    @Input()
    public popupContainer: ViewContainerRef;

    constructor(private viewContainerRef: ViewContainerRef,
                private resolver: ComponentFactoryResolver,
                private sanitizer: DomSanitizer) {}

    public getViewContainer(): ViewContainerRef {
        if (this.popupContainer) {
            return this.popupContainer;
        }
        return this.viewContainerRef;
    }

    @HostListener('focusin')
    @HostListener('mouseenter')
    public show(): void {
        if (this.visible) {
            return;
        }

        this.visible = true;
        if (typeof this.content === 'string') {
            const factory = this.resolver.resolveComponentFactory<PopupContentComponent>(PopupContentComponent);
            if (!this.visible) {
                return;
            }

            this.tooltip = this.getViewContainer().createComponent<PopupContentComponent>(factory);
            this.tooltip.instance.hostElement = this.viewContainerRef.element.nativeElement;
            this.tooltip.instance.content = this.sanitizer.bypassSecurityTrustHtml(this.content as string);
            this.tooltip.instance.header = this.header;
            this.tooltip.instance.popupWidth = this.popupWidth;
            this.tooltip.instance.placement = this.tooltipPlacement;
            this.tooltip.instance.arrowPosition = this.arrowPosition;
        } else {
            const tooltip = this.content as PopupContentComponent;
            tooltip.hostElement = this.getViewContainer().element.nativeElement;
            tooltip.placement = this.tooltipPlacement;
            tooltip.show();
        }
    }

    @HostListener('focusout')
    @HostListener('mouseleave')
    public hide(): void {
        if (!this.visible) {
            return;
        }

        this.visible = false;
        if (this.tooltip) {
            this.tooltip.destroy();
        }

        if (this.content instanceof PopupContentComponent) {
            (this.content as PopupContentComponent).hide();
        }
    }
}

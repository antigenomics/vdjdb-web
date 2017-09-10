import { ComponentFactoryResolver, ComponentRef, Directive, HostListener, Input, ViewContainerRef } from "@angular/core";
import { PopupContentComponent } from "./popup-content.component";
import { DomSanitizer } from "@angular/platform-browser";

@Directive({
    selector: "[popup]"
})
export class PopupDirective {
    private tooltip: ComponentRef<PopupContentComponent>;
    private visible: boolean;

    @Input("popup")
    content: string | PopupContentComponent;

    @Input("popupHeader")
    header: string;

    @Input("popupWidth")
    popupWidth: "" | "wide" | "very wide" = "";

    @Input()
    tooltipPlacement: "top" | "bottom" | "left" | "right" = "left";

    constructor(private viewContainerRef: ViewContainerRef,
                private resolver: ComponentFactoryResolver,
                private sanitizer: DomSanitizer) {}

    @HostListener("focusin")
    @HostListener("mouseenter")
    show(): void {
        if (this.visible) {
            return;
        }

        this.visible = true;
        if (typeof this.content === "string") {
            const factory = this.resolver.resolveComponentFactory<PopupContentComponent>(PopupContentComponent);
            if (!this.visible) {
                return;
            }

            this.tooltip = this.viewContainerRef.createComponent<PopupContentComponent>(factory);
            this.tooltip.instance.hostElement = this.viewContainerRef.element.nativeElement;
            this.tooltip.instance.content = this.sanitizer.bypassSecurityTrustHtml(this.content as string);
            this.tooltip.instance.header = this.header;
            this.tooltip.instance.popupWidth = this.popupWidth;
            this.tooltip.instance.placement = this.tooltipPlacement;
        } else {
            const tooltip = this.content as PopupContentComponent;
            tooltip.hostElement = this.viewContainerRef.element.nativeElement;
            tooltip.placement = this.tooltipPlacement;
            tooltip.show();
        }
    }

    @HostListener("focusout")
    @HostListener("mouseleave")
    hide(): void {
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
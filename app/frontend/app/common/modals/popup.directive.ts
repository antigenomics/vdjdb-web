import { Directive, ElementRef } from "@angular/core";

@Directive({
    selector: "[popup]"
})
export class PopupDirective {
    constructor(private element: ElementRef) {
        $(this.element.nativeElement).popup({
            inline:    false,
            hoverable: true
        });
    }
}
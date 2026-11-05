import { AfterViewInit, Directive, ElementRef } from '@angular/core';

/** Associate Semantic's sibling label with its native checkbox, including repeated forms. */
@Directive({ selector: '[checkbox]' })
export class CheckboxDirective implements AfterViewInit {
    private static nextId = 0;

    constructor(private elementRef: ElementRef) {}

    public ngAfterViewInit(): void {
        const input: HTMLInputElement = this.elementRef.nativeElement.querySelector('input[type="checkbox"]');
        const label: HTMLLabelElement = this.elementRef.nativeElement.querySelector('label');
        if (input && label) {
            if (!input.id) { input.id = 'vdjdb-checkbox-' + ++CheckboxDirective.nextId; }
            label.htmlFor = input.id;
        }
    }
}

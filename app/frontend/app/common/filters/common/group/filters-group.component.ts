import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';
import { FiltersGroupService } from "./filters-group.service";

@Component({
    selector:    'filters-group',
    templateUrl: './filters-group.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FiltersGroupComponent implements OnDestroy, OnInit {
    private hidden: boolean = true;
    private timeout: number = -1;

    @Input() title: string = '';

    @ViewChild('accordionTitle') accordionTitle: ElementRef;
    @ViewChild('accordionContent') accordionContent: ElementRef;

    constructor(private group: FiltersGroupService, private renderer: Renderer2) {}

    ngOnInit(): void {
        this.renderer.setStyle(this.accordionContent.nativeElement, 'transition', 'max-height 0.45s ease-in-out');
        this.renderer.setStyle(this.accordionContent.nativeElement, 'max-height', 0);
        this.renderer.setStyle(this.accordionContent.nativeElement, 'overflow', 'hidden');
        let state = this.group.getSavedState(this.title);
        if (!state.collapsed) {
            this.toggle();
        }
    }

    toggle() : void {
        if (this.hidden) {
            this.renderer.addClass(this.accordionTitle.nativeElement, 'active');
            this.renderer.setStyle(this.accordionContent.nativeElement, 'max-height', this.accordionContent.nativeElement.scrollHeight + 50 + 'px');
            this.timeout = window.setTimeout(() => {
                this.renderer.setStyle(this.accordionContent.nativeElement, 'overflow', 'visible');
                this.timeout = -1;
            }, 450)
        } else {
            if (this.timeout !== -1) window.clearTimeout(this.timeout);
            this.renderer.removeClass(this.accordionTitle.nativeElement, 'active');
            this.renderer.setStyle(this.accordionContent.nativeElement, 'overflow', 'hidden');
            this.renderer.setStyle(this.accordionContent.nativeElement, 'max-height', '0');
        }
        this.hidden = !this.hidden;
    }

    ngOnDestroy(): void {
        this.group.saveState(this.title, { collapsed: !this.accordionTitle.nativeElement.classList.contains('active') });
    }
}
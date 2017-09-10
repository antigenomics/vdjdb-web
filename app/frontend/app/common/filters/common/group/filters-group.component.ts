import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FiltersGroupService } from "./filters-group.service";

@Component({
    selector:    'filters-group',
    templateUrl: './filters-group.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FiltersGroupComponent implements OnDestroy, OnInit {
    private hidden: boolean = true;

    @Input() title: string = '';

    @ViewChild('accordionTitle') accordionTitle: ElementRef;
    @ViewChild('accordionContent') accordionContent: ElementRef;

    constructor(private group: FiltersGroupService) {}

    ngOnInit(): void {
        this.accordionContent.nativeElement.style['display']    = 'block';
        this.accordionContent.nativeElement.style['overflow']   = 'hidden';
        this.accordionContent.nativeElement.style['transition'] = 'max-height 0.45s ease-in-out';
        this.accordionContent.nativeElement.style['max-height'] = '0';

        let state = this.group.getSavedState(this.title);
        if (!state.collapsed) {
            this.toggle();
        }
    }

    toggle() : void {
        if (this.hidden) {
            this.accordionContent.nativeElement.style['max-height'] = this.accordionContent.nativeElement.scrollHeight + 50 + 'px';
        } else {
            this.accordionContent.nativeElement.style['max-height'] = '0';
        }
        this.accordionTitle.nativeElement.classList.toggle('active');
        this.accordionContent.nativeElement.classList.toggle('active');
        this.hidden = !this.hidden;
    }

    ngOnDestroy(): void {
        this.group.saveState(this.title, { collapsed: !this.accordionContent.nativeElement.classList.contains('active') });
    }
}
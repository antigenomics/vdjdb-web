import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FiltersGroupService } from "./filters-group.service";

@Component({
    selector:    'filters-group',
    templateUrl: './filters-group.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FiltersGroupComponent implements OnDestroy, OnInit {
    @Input() title: string = '';

    @ViewChild('accordionTitle') accordionTitle: ElementRef;
    @ViewChild('accordionContent') accordionContent: ElementRef;

    constructor(private element: ElementRef, private group: FiltersGroupService) {}

    ngOnInit(): void {
        let state = this.group.getSavedState(this.title);
        if (!state.collapsed) {
            this.accordionTitle.nativeElement.classList.add('active');
            this.accordionContent.nativeElement.classList.add('active');
        }
        $(this.element.nativeElement).accordion({
            exclusive: false,
            animateChildren: false,
            silent: true
        });
    }

    ngOnDestroy(): void {
        this.group.saveState(this.title, { collapsed: !this.accordionContent.nativeElement.classList.contains('active') });
    }
}
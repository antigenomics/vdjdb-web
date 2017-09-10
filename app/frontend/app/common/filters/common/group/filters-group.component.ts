import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
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

    constructor(private group: FiltersGroupService) {}

    ngOnInit(): void {
        this.accordionContent.nativeElement.style['transition'] = 'max-height 0.45s ease-in-out';
        this.accordionContent.nativeElement.style['max-height'] = '0';

        let state = this.group.getSavedState(this.title);
        if (!state.collapsed) {
            this.toggle();
        }
    }

    toggle() : void {
        if (this.hidden) {
            if (this.timeout !== -1) window.clearTimeout(this.timeout);
            this.accordionTitle.nativeElement.classList.add('active');
            this.accordionContent.nativeElement.classList.add('active');
            this.accordionContent.nativeElement.style['max-height'] = this.accordionContent.nativeElement.scrollHeight + 50 + 'px';
        } else {
            this.accordionContent.nativeElement.style['overflow'] = 'hidden';
            this.accordionContent.nativeElement.style['max-height'] = '0';
            this.timeout = window.setTimeout(() => {
                this.accordionTitle.nativeElement.classList.remove('active');
                this.accordionContent.nativeElement.classList.remove('active');
                this.accordionContent.nativeElement.style['overflow'] = 'visible';
                this.timeout = -1;
            }, 450)
        }
        this.hidden = !this.hidden;
    }

    ngOnDestroy(): void {
        this.group.saveState(this.title, { collapsed: !this.accordionContent.nativeElement.classList.contains('active') });
    }
}
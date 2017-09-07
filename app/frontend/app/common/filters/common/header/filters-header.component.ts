import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';

@Component({
    selector:    'filters-header',
    templateUrl: './filters-header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FiltersHeaderComponent implements OnInit {
    @Input() title: string;
    @Input() help: string;
    popupContent: string;

    @ViewChild('popupElement') popupElement: ElementRef;

    ngOnInit(): void {
        this.popupContent = '<div class=\'header\'>' + this.title + '</div><div class=\'content\'>' + this.help + '</div>'
        $(this.popupElement.nativeElement).popup();
    }
}
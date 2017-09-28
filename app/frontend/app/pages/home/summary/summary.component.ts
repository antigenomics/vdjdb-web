import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { SummaryService } from './summary.service';

@Component({
    selector: 'summary',
    template: '<div #summaryContainer></div>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryComponent implements OnInit {
    @ViewChild('summaryContainer', { read: ElementRef })
    public summaryContainer: ElementRef;

    constructor(public summaryService: SummaryService) {}

    public ngOnInit(): void {
        this.summaryService.getSummaryContent().subscribe((text: string) => {
            this.summaryContainer.nativeElement.innerHTML = text;
        });
    }
}

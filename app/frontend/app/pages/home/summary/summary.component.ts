import { ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, ViewContainerRef } from '@angular/core';

@Component({
    selector: 'summary',
    template: '<div #summaryContainer></div>',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SummaryComponent implements OnInit {
    @ViewChild('summaryContainer', { read: ElementRef })
    public summaryContainer: ElementRef;

    public ngOnInit(): void {
        // TODO
        const xhttp = new XMLHttpRequest();
        const container = this.summaryContainer;
        xhttp.onreadystatechange = function() {
            if (this.readyState === 4 && this.status === 200) {
                container.nativeElement.innerHTML = this.responseText;
                console.log(this.responseText);
            }
        };
        xhttp.onerror = () => {
            console.log('summary error');
        };
        xhttp.onabort = () => {
            console.log('summary abort');
        };
        xhttp.open('GET', '/api/database/summary', true);
        xhttp.send();
    }
}

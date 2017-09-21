import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

export class ExportFormat {
    public name: string;
    public title: string;

    constructor(name: string, title: string) {
        this.name = name;
        this.title = title;
    }
}

@Component({
    selector:        'search-table-export',
    templateUrl:     './search-table-export.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableExportComponent {
    @Input()
    public formats: ExportFormat[];

    @Output()
    public exportEvent = new EventEmitter();

    public exportTable(format: ExportFormat): void {
        this.exportEvent.emit(format);
    }
}

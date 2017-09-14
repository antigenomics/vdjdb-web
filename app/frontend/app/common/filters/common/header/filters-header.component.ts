import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
    selector:    'filters-header',
    templateUrl: './filters-header.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FiltersHeaderComponent {
    @Input()
    public title: string;

    @Input()
    public help: string;
}

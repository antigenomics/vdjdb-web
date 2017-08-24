import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
    selector:    'filters-group',
    templateUrl: './filters-group.component.html',
    styleUrls: [ './filters-group.component.css' ],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class FiltersGroupComponent {
    isCollapsed: boolean = true;

    @Input()
    title: string = '';

    toggle() {
        this.isCollapsed = !this.isCollapsed;
    }
}
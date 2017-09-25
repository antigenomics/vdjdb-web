import { ChangeDetectionStrategy, Component, ComponentFactoryResolver, ComponentRef, HostListener, ViewContainerRef } from '@angular/core';
import { SearchTableRowComponent } from '../../row/search-table-row.component';
import { SearchTableRow } from '../../row/search-table-row';

@Component({
    selector: 'td[search-table-entry-gene]',
    template: '{{ value }}',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableEntryGeneComponent {
    // private _row: SearchTableRow;
    private _value: string;
    // private _viewContainer: ViewContainerRef;
    // private _pairedRow: ComponentRef<SearchTableRowComponent>;

    // constructor(private resolver: ComponentFactoryResolver) {}

    public generate(value: string, _: ViewContainerRef, __: SearchTableRow): void {
        this._value = value;
        // this._viewContainer = viewContainer;
        // this._row = row;
    }

    @HostListener('click')
    public checkPaired(): void {
        // const rowComponentResolver = this.resolver.resolveComponentFactory<SearchTableRowComponent>(SearchTableRowComponent);
        // const component = this._viewContainer.createComponent(rowComponentResolver);
        // component.instance.row = this._row;
        // console.log(this._row);
    }

    get value(): string {
        return this._value;
    }
}

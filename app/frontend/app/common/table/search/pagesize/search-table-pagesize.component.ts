import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { InputConverter, NumberConverter } from '../../../../utils/input-converter.decorator';

@Component({
    selector:        'search-table-pagesize',
    templateUrl:     './search-table-pagesize.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTablePagesizeComponent {
    @Input()
    @InputConverter(NumberConverter)
    public pageSize: number;

    @Input()
    public sizes: number[];

    @Output()
    public changePageSize = new EventEmitter();

    public changeSize(size: number): void {
        this.pageSize = size;
        this.changePageSize.emit(size);
    }
}

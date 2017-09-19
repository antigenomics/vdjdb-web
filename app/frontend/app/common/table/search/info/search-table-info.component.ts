import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { InputConverter, NumberConverter } from '../../../../utils/input-converter.decorator';

@Component({
    selector:        'search-table-info',
    templateUrl:     './search-table-info.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableInfoComponent {
    @Input()
    @InputConverter(NumberConverter)
    public found: number;

    @Input()
    @InputConverter(NumberConverter)
    public total: number;
}

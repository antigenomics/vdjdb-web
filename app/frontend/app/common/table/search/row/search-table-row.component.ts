import {
    ChangeDetectionStrategy, Component, ComponentFactoryResolver, ComponentRef, HostBinding, Input, OnDestroy, OnInit,
    ViewChild, ViewContainerRef
} from '@angular/core';
import { BooleanConverter, InputConverter } from '../../../../utils/input-converter.decorator';
import { LoggerService } from '../../../../utils/logger/logger.service';
import { SearchTableEntryCdrComponent } from '../entry/cdr/search-table-entry-cdr.component';
import { SearchTableEntryGeneComponent } from '../entry/gene/search-table-entry-gene.component';
import { SearchTableEntryJsonComponent } from '../entry/json/search-table-entry-json.component';
import { SearchTableEntryOriginalComponent } from '../entry/original/search-table-entry-original.component';
import { SearchTableEntry } from '../entry/search-table-entry';
import { SearchTableEntryUrlComponent } from '../entry/url/search-table-entry-url.component';
import { SearchTableService } from '../search-table.service';
import { SearchTableRow } from './search-table-row';

@Component({
    selector:        'tr[search-table-row]',
    templateUrl:     './search-table-row.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchTableRowComponent implements OnInit, OnDestroy {
    private components: Array<ComponentRef<any>> = [];

    @HostBinding('class.center')
    public centered: boolean = true;

    @HostBinding('class.aligned')
    public aligned: boolean = true;

    @Input('allowPaired')
    @InputConverter(BooleanConverter)
    public allowPaired: boolean = true;

    @Input('search-table-row')
    public row: SearchTableRow;

    @ViewChild('rowViewContainer', { read: ViewContainerRef })
    public rowViewContainer: ViewContainerRef;

    constructor(private hostViewContainer: ViewContainerRef, private resolver: ComponentFactoryResolver,
                private table: SearchTableService, private logger: LoggerService) {}

    public ngOnInit(): void {
        const cdrComponentResolver = this.resolver.resolveComponentFactory<SearchTableEntryCdrComponent>(SearchTableEntryCdrComponent);
        const urlComponentResolver = this.resolver.resolveComponentFactory<SearchTableEntryUrlComponent>(SearchTableEntryUrlComponent);
        const jsonComponentResolver = this.resolver.resolveComponentFactory<SearchTableEntryJsonComponent>(SearchTableEntryJsonComponent);
        const originalComponentResolver = this.resolver.resolveComponentFactory<SearchTableEntryOriginalComponent>(SearchTableEntryOriginalComponent);
        const geneComponentResolver = this.resolver.resolveComponentFactory<SearchTableEntryGeneComponent>(SearchTableEntryGeneComponent);
        const rowComponentResolver = this.resolver.resolveComponentFactory<SearchTableRowComponent>(SearchTableRowComponent);

        if (this.row.entries) {
            this.row.entries.forEach((entry: SearchTableEntry, index: number) => {
                const column = this.table.columns[ index ];
                if (entry.column === column.name) {
                    let component: ComponentRef<any>;
                    switch (entry.column) {
                        case 'gene':
                            if (this.allowPaired) {
                                component = this.rowViewContainer.createComponent<SearchTableEntryGeneComponent>(geneComponentResolver);
                                component.instance.generate(entry.value, this.row.metadata.pairedID, this.hostViewContainer, rowComponentResolver);
                            } else {
                                component = this.rowViewContainer.createComponent<SearchTableEntryOriginalComponent>(originalComponentResolver);
                                component.instance.generate(`${entry.value}`);
                            }
                            break;
                        case 'cdr3':
                            component = this.rowViewContainer.createComponent<SearchTableEntryCdrComponent>(cdrComponentResolver);
                            component.instance.generate(entry.value, this.row);
                            break;
                        case 'reference.id':
                            component = this.rowViewContainer.createComponent<SearchTableEntryUrlComponent>(urlComponentResolver);
                            component.instance.generate(entry.value);
                            break;
                        case 'method':
                        case 'meta':
                        case 'cdr3fix':
                            component = this.rowViewContainer.createComponent<SearchTableEntryJsonComponent>(jsonComponentResolver);
                            component.instance.generate(column.title, entry.value, column);
                            break;
                        default:
                            component = this.rowViewContainer.createComponent<SearchTableEntryOriginalComponent>(originalComponentResolver);
                            component.instance.generate(entry.value);
                    }
                    this.components.push(component);
                } else {
                    this.logger.debug(`Assert ${entry.column} === ${column.name} failed.`, 'Data corrupted');
                }
            });
        }
    }

    public ngOnDestroy(): void {
        this.components.forEach((component: ComponentRef<any>) => {
            component.destroy();
        });
    }
}

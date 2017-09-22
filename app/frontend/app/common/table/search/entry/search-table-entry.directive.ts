import { ComponentFactoryResolver, ComponentRef, Directive, Input, OnDestroy, OnInit, ViewContainerRef } from '@angular/core';
import { DatabaseColumnInfo } from '../../../../database/database-metadata';
import { LoggerService } from '../../../../utils/logger/logger.service';
import { SearchTableRow } from '../row/search-table-row';
import { SearchTableEntryCdrComponent } from './cdr/search-table-entry-cdr.component';
import { SearchTableEntryJsonComponent } from './json/search-table-entry-json.component';
import { SearchTableEntryOriginalComponent } from './original/search-table-entry-original.component';
import { SearchTableEntry } from './search-table-entry';
import { SearchTableEntryUrlComponent } from './url/search-table-entry-url.component';

@Directive({
    selector: '[search-table-entry]'
})
export class SearchTableEntryDirective implements OnInit, OnDestroy {
    private component: ComponentRef<any>;

    @Input('search-table-entry')
    public entry: SearchTableEntry;

    @Input('column-meta')
    public column: DatabaseColumnInfo;

    @Input('parent-row')
    public row: SearchTableRow;

    constructor(private viewContainerRef: ViewContainerRef, private resolver: ComponentFactoryResolver, private logger: LoggerService) {}

    public ngOnInit() {
        if (this.entry.column === this.column.name) {
            switch (this.column.name) {
                case 'cdr3':
                    const cdr = this.resolver.resolveComponentFactory<SearchTableEntryCdrComponent>(SearchTableEntryCdrComponent);
                    this.component = this.viewContainerRef.createComponent<SearchTableEntryCdrComponent>(cdr);
                    this.component.instance.generate(this.entry.value, this.row);
                    break;
                case 'reference.id':
                    const url = this.resolver.resolveComponentFactory<SearchTableEntryUrlComponent>(SearchTableEntryUrlComponent);
                    this.component = this.viewContainerRef.createComponent<SearchTableEntryUrlComponent>(url);
                    this.component.instance.generate(this.entry.value);
                    break;
                case 'method':
                case 'meta':
                case 'cdr3fix':
                    const json = this.resolver.resolveComponentFactory<SearchTableEntryJsonComponent>(SearchTableEntryJsonComponent);
                    this.component = this.viewContainerRef.createComponent<SearchTableEntryJsonComponent>(json);
                    this.component.instance.generate(this.column.title, this.entry.value, this.column);
                    break;
                default:
                    const original = this.resolver.resolveComponentFactory<SearchTableEntryOriginalComponent>(SearchTableEntryOriginalComponent);
                    this.component = this.viewContainerRef.createComponent<SearchTableEntryOriginalComponent>(original);
                    this.component.instance.generate(this.entry.value);
            }
        } else {
            this.logger.debug(`Assert ${this.entry.column} === ${this.column.name} failed.`, 'Data corrupted');
        }
    }

    public ngOnDestroy() {
        if (this.component) {
            this.component.destroy();
        }
    }
}